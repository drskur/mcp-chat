# src/agent/react_agent/__init__.py
from datetime import datetime, timezone
from typing import Dict, List, Literal, cast, Any, AsyncGenerator, Optional, Tuple, Callable, Union
import os
import logging
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import sys
import ast
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph
from langgraph.prebuilt import ToolNode, create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from colorama import Fore, Style, init

from src.common.configuration import Configuration
from src.agent.react_agent.state.model import InputState, State
from src.common.tools import TOOLS
from src.common.utils import process_attachments, create_message_with_attachments
from src.common.llm import get_llm
from src.agent.react_agent.prompt import prompt_manager
from src.mcp_client.mcp_service import MCPService


# Set up logger
logger = logging.getLogger(__name__)

# Initialize colorama
init(autoreset=True)

# Initialize memory saver
memory = MemorySaver()

class ReactAgent:
    """
    Class for LangGraph-based ReAct agent
    """
    def __init__(self, model_id: str=None, max_tokens: int=4096, mcp_json_path: str=None, reload_prompt: bool=False):
        # Load environment variables
        load_dotenv()
        # Set model ID and MCP JSON path
        self.model_id = model_id
        self.mcp_json_path = mcp_json_path

        # Initialize model
        self.model = get_llm(model_id=self.model_id, max_tokens=max_tokens)

        # State tracking storage
        self.execution_state = {}
        
        # Conversation history storage
        self.conversation_history = {}
        
        # Debug mode setting
        self.debug_mode = os.getenv("DEBUG_MODE", "False").lower() == "true"

        if reload_prompt:
            # prompt cache clear
            prompt_manager.clear_cache()
            logger.info("prompt cache cleared")
        
        # Initialize MCP service
        self.mcp_service = MCPService(mcp_json_path)
        
        # Create graph
        self.graph = self._build_graph()
        self.graph.name = "ReAct Agent"
        
    @asynccontextmanager
    async def _make_graph(self, tools):
        """
        Initialize tools and Bedrock model to create a graph

        Args:
            tools: MCP tools dictionary
            
        Yields:
            Agent object
        """
        agent = create_react_agent(self.model, tools, checkpointer=memory)
        yield agent

    async def _call_model(self, state: State, config: RunnableConfig) -> Dict[str, Any]:
        """
        Call the LLM to drive the agent
        
        Args:
            state: Current conversation state
            config: Execution configuration
            
        Returns:
            Dictionary containing the model response
        """
        # check if system prompt is needed
        needs_system_prompt = True
        for msg in state.messages:
            if isinstance(msg, SystemMessage):
                needs_system_prompt = False
                break
        
        # if system prompt is needed, add it
        if needs_system_prompt:
            system_prompt = prompt_manager.get_prompt(
                "agent_profile", 
                DATETIME=datetime.now(tz=timezone.utc).isoformat()
            )["system_prompt"]
            prompt_messages = [SystemMessage(content=system_prompt)] + state.messages
        else:
            # if SystemMessage is already in the messages, use it
            prompt_messages = state.messages
        
        # log message size
        message_size = sys.getsizeof(str(prompt_messages))
        logger.debug(f"prompt message size: {message_size/1024:.2f} KB")

        # Get MCP tools
        tools = self.mcp_service.get_tools()
        if not tools:
            logger.warning("MCP tools are not initialized. Continue with empty tool list.")
            tools = []
            
        # improve tool logging - classify tools by server
        tool_names = set()
        server_tool_counts = {}
        
        for tool in tools:
            if hasattr(tool, "name"):
                tool_names.add(tool.name)
                # extract server name (generally, tool names are in the format 'mcp_server_name_function')
                server_name = tool.name.split('_')[0] if '_' in tool.name else "etc"
                server_tool_counts[server_name] = server_tool_counts.get(server_name, 0) + 1
        
        # log total summary and server-wise distribution
        logger.info(f"available MCP tools: {len(server_tool_counts)} servers, {len(tools)} tools")
        
        # log server-wise tool count
        server_summary = ", ".join([f"{server}: {count}개" for server, count in server_tool_counts.items()])
        if server_summary:
            logger.debug(f"tool distribution: {server_summary}")

        # Model response variable
        response = None

        # Update execution state
        thread_id = self._get_thread_id(config)
        self._update_execution_state(thread_id)
        
        # Use context manager to create graph
        async with self._make_graph(tools) as my_agent:
            # Pass messages to the correct dictionary structure
            response = cast(
                AIMessage,
                await my_agent.ainvoke(
                    {"messages": prompt_messages},
                    config,
                ),
            )

        # If it's the last step and the model still wants to use tools
        if state.is_last_step and response.tool_calls:
            result_message = AIMessage(
                id=response.id,
                content="Unable to find an answer to the question within the specified step count."
            )
            
            return {
                "messages": [result_message]
            }

        # Return list to add model response to existing messages
        return {
            "messages": [response["messages"][-1]]
        }
    
    def route_model_output(self, state: State) -> Literal["__end__", "tools"]:
        """
        Determine the next node based on the model output
        
        Args:
            state: Current conversation state
            
        Returns:
            Name of the next node to call
        """
        last_message = state.messages[-1]
        if not isinstance(last_message, AIMessage):
            raise ValueError(
                f"Expected AIMessage in the output edge, but received {type(last_message).__name__}."
            )
            
        # If there are no tool calls, end
        if not last_message.tool_calls:
            return "__end__"
            
        # Otherwise, execute the requested task
        return "tools"

    def _build_graph(self) -> StateGraph:
        """
        Build the agent graph
        
        Returns:
            Agent graph
        """
        # Define a new graph
        builder = StateGraph(State, input=InputState, config_schema=Configuration)

        # Define the two nodes to repeat - separate from class method as a general function
        builder.add_node("call_model", self._call_model)
        builder.add_node("tools", ToolNode(TOOLS))

        # Set the starting point to `call_model`
        builder.add_edge("__start__", "call_model")

        # Add a conditional edge after `call_model`
        builder.add_conditional_edges(
            "call_model",
            self.route_model_output,
        )

        # Add a general edge from `tools` to `call_model`
        builder.add_edge("tools", "call_model")

        # Compile the builder into an executable graph
        graph = builder.compile(
            interrupt_before=[],  # Add the node name to update the state before calling
            interrupt_after=[],   # Add the node name to update the state after calling
        )
        
        return graph
        
    def _get_thread_id(self, config: RunnableConfig) -> str:
        """
        Extract thread ID from config with default fallback
        
        Args:
            config: Execution configuration
            
        Returns:
            Thread ID string
        """
        return config.get("thread_id", "default_thread")
    
    def _update_execution_state(self, thread_id: str) -> None:
        """
        Update execution state for the given thread ID
        
        Args:
            thread_id: Thread identifier
        """
        if thread_id not in self.execution_state:
            self.execution_state[thread_id] = {"step": 0, "current_phase": "initial"}
        else:
            self.execution_state[thread_id]["step"] += 1
    
    def _get_current_step(self, thread_id: str) -> int:
        """
        Get current step for the thread
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Current step number
        """
        return self.execution_state.get(thread_id, {"step": 0})["step"]
    
    def _normalize_content(self, content: Any) -> str:
        """
        Normalize message content to string format
        
        Args:
            content: Message content (string, list, or other)
            
        Returns:
            Normalized string content
        """
        if content is None:
            return ""
        
        if isinstance(content, list):
            return "".join(str(item) for item in content)
        
        return str(content)
    
    def _add_user_message_to_history(self, 
                                     thread_id: str, 
                                     messages: List[BaseMessage]) -> None:
        """
        Add user messages to conversation history
        
        Args:
            thread_id: Thread identifier
            messages: List of messages to process
        """
        # Make sure thread history exists
        if thread_id not in self.conversation_history:
            self.conversation_history[thread_id] = []
        
        # Extract message history for this thread
        message_history = self.conversation_history[thread_id]
        
        # Add user messages to history
        for msg in messages:
            if isinstance(msg, HumanMessage):
                content = self._normalize_content(msg.content)
                if content:  # Skip empty messages
                    message_history.append({
                        "role": "user", 
                        "content": content
                    })
    
    def _add_assistant_message_to_history(self, thread_id: str, message: Union[AIMessage, str]) -> None:
        """
        add assistant message to conversation history
        
        Args:
            thread_id: thread ID
            message: assistant message
        """
        # initialize thread history if needed
        if thread_id not in self.conversation_history:
            self.conversation_history[thread_id] = []
        
        # extract message content
        content = ""
        if isinstance(message, AIMessage):
            content = self._normalize_content(message.content)
        else:
            content = self._normalize_content(message)
        
        # ignore empty message
        if not content:
            return
        
        # check for duplicate message
        if self.conversation_history[thread_id]:
            last_message = self.conversation_history[thread_id][-1]
            # if the last message is already an assistant message and the content is the same, do not add it
            if (last_message["role"] == "assistant" and 
                self._normalize_content(last_message["content"]) == content):
                logger.info("duplicate assistant message detected - not added to history")
                return
        
        # add message to history
        self.conversation_history[thread_id].append({
            "role": "assistant",
            "content": content
        })
        
        # logging
        logger.info(f"assistant message added to history (length: {len(content)})")
        if self.debug_mode:
            logger.info(f"history message count: {len(self.conversation_history[thread_id])}")
    
    def _prepare_conversation(self, thread_id: str, input_messages: List[BaseMessage]) -> List[BaseMessage]:
        """prepare conversation function - combine history and current input"""
        
        # extract current user messages
        current_user_messages = [msg for msg in input_messages if isinstance(msg, HumanMessage)]
        
        # initialize thread history if needed
        if thread_id not in self.conversation_history:
            self.conversation_history[thread_id] = []
            
        # add current user messages to history
        if current_user_messages:
            for msg in current_user_messages:
                content = self._normalize_content(msg.content)
                if content:
                    self.conversation_history[thread_id].append({
                        "role": "user",
                        "content": content
                    })
        
        # get system prompt
        system_prompt = prompt_manager.get_prompt(
            "agent_profile", 
            DATETIME=datetime.now(tz=timezone.utc).isoformat()
        )["system_prompt"]
        
        # complete conversation (system message + all messages in history)
        conversation = [SystemMessage(content=system_prompt)]
        
        # add all messages in history
        for msg in self.conversation_history[thread_id]:
            content = self._normalize_content(msg["content"])
            if not content:
                continue
                
            if msg["role"] == "user":
                conversation.append(HumanMessage(content=content))
            elif msg["role"] == "assistant":
                conversation.append(AIMessage(content=content))
        
        # logging
        if self.debug_mode:
            logger.info(f"conversation history: {len(self.conversation_history[thread_id])} messages")
            logger.info(f"configured conversation: {len(conversation)} messages")
            
        return conversation
    
    def _log_conversation_debug(self, conversation: List[BaseMessage]) -> None:
        """
        Log debug information about the conversation
        
        Args:
            conversation: Conversation messages to log
        """
        if self.debug_mode:
            logger.info(f"sending {len(conversation)} messages")
            for i, msg in enumerate(conversation):
                content = self._normalize_content(msg.content)
                logger.info(
                    f"message {i}: {type(msg).__name__}, "
                    f"content length: {len(content)}, "
                    f"type: {type(msg.content)}"
                )
        
    async def astream(
        self, 
        input_state: InputState, 
        config: RunnableConfig,
        stream_mode: str = "messages",
        files: List[Dict[str, Any]] = None
    ) -> AsyncGenerator[Tuple[BaseMessage, Dict[str, Any]], None]:
        """
        Run the agent in streaming mode
        
        Args:
            input_state: Input state
            config: Execution configuration
            stream_mode: Streaming mode
            files: List of file attachments (optional)
            
        Yields:
            Message chunks and metadata
        """
        # process attachments
        attachments = []
        attachment_errors = []
        if files:
            try:
                logger.info(f"processing {len(files)} attachments")
                attachments, attachment_errors = await process_attachments(files)
                logger.info(f"attachment processing complete: {len(attachments)} successful, {len(attachment_errors)} errors")
                
                # if there are errors, log them
                for error in attachment_errors:
                    logger.warning(f"attachment error: {error}")
            except Exception as e:
                logger.error(f"error occurred during attachment processing: {str(e)}")
                attachment_errors.append("error occurred during attachment processing")
        
        # Get thread ID and initialize state
        thread_id = self._get_thread_id(config)
        self.execution_state[thread_id] = {"step": 0, "current_phase": "initial"}
        
        # if there are attachment errors, return them first
        if attachment_errors:
            error_message = AIMessage(content=f"error occurred during attachment processing:\n" + "\n".join(f"- {error}" for error in attachment_errors))
            metadata = {
                "langgraph_node": "error",
                "langgraph_step": 0,
                "type": "error"
            }
            yield error_message, metadata
            return
        
        # Prepare conversation from history
        conversation = self._prepare_conversation(thread_id, input_state.messages)
        
        # if there are attachments, convert message format
        if conversation and isinstance(conversation[-1], HumanMessage) and attachments:
            last_message = conversation[-1]
            original_content = last_message.content
            
            # convert message with attachments
            formatted_message = create_message_with_attachments(original_content, attachments)
            
            # replace last message
            if isinstance(formatted_message, dict) and "content" in formatted_message:
                # convert to LangChain format (pass content array directly)
                conversation[-1] = HumanMessage(content=formatted_message["content"])
                logger.info("converted message with attachments (content array)")
            else:
                # if it's a string, use it as is
                conversation[-1] = HumanMessage(content=formatted_message)
                logger.info("converted message with attachments")
        
        # Update input state with prepared conversation
        input_state.messages = conversation

        # print(f"{Fore.CYAN}input_state.messages: {input_state.messages}{Style.RESET_ALL}") 
        
        print(f"\n{Fore.CYAN}=== ReAct Agent execution started ==={Style.RESET_ALL}\n") 

        # Last chunk for saving to history later
        last_chunk = None
        full_response = ""
        
        # before streaming
        message_size = sys.getsizeof(str(input_state))
        logger.debug(f"Sending message size: {message_size/1024:.2f} KB")

        # print(f"message: {input_state.messages}")
        
        # Start streaming
        try:
            async for chunk in self.graph.astream(
                input_state, 
                config,
                stream_mode=stream_mode
            ):
                # Process chunk and metadata
                if isinstance(chunk, tuple) and len(chunk) == 2:
                    message_chunk, metadata = chunk
                    
                    # Save last chunk
                    last_chunk = message_chunk
                    is_image = False
                    image_data = None
                    mime_type = None

                    # print(f"chunk: {chunk}")
                    if isinstance(message_chunk, AIMessage) and hasattr(message_chunk, "content"):
                        chunk_content = self._normalize_content(message_chunk.content)
                        if isinstance(chunk_content, dict) and chunk_content.get("type") == "text":
                            full_response += chunk_content.get("text", "")
                        # if chunk_content is a string
                        elif isinstance(chunk_content, str):
                            # if chunk_content is a dictionary
                            if chunk_content.startswith("{'type': 'text'") or chunk_content.startswith("{'text'"):
                                try:
                                    # Convert string to dictionary
                                    dict_content = ast.literal_eval(chunk_content)
                                    
                                    # If 'text' key exists, extract the value
                                    if 'text' in dict_content:
                                        text = dict_content['text']
                                        full_response += text
                                        # logger.info(f"extracted text from dictionary: '{text}', accumulated length: {len(full_response)}")
                                    else:
                                        # logger.info(f"dictionary without 'text' key: {dict_content}")
                                        pass
                                except Exception as e:
                                    logger.error(f"String to dictionary conversion error: {str(e)}")
                                    # if conversion fails, use the original string
                                    full_response += chunk_content
                            else:
                                pass
                    
                    # Add LangGraph step information to metadata
                    if "langgraph_step" not in metadata:
                        current_step = self._get_current_step(thread_id)
                        metadata["langgraph_step"] = current_step
                        
                    # Add node type to metadata if missing
                    if "langgraph_node" not in metadata:
                        # Estimate node type based on message type
                        if hasattr(message_chunk, "tool_calls") and message_chunk.tool_calls:
                            metadata["langgraph_node"] = "tools"
                        else:
                            metadata["langgraph_node"] = "agent"
                    
                    if hasattr(message_chunk, "artifact") and message_chunk.artifact:
                        for artifact_item in message_chunk.artifact:
                            if hasattr(artifact_item, "type") and artifact_item.type == "image":
                                is_image = True
                                image_data = artifact_item.data
                                mime_type = getattr(artifact_item, "mimeType", "image/png")
                                # print(f"이미지 데이터 발견: {len(image_data)}")
                    
                    # If an image is found, process it
                    if is_image and image_data:
                        # Add image information to metadata
                        metadata["is_image"] = True
                        metadata["image_data"] = image_data
                        metadata["mime_type"] = mime_type
                        
                        # Create a special image message
                        # Use a special message type instead of AIMessage
                        img_message = AIMessage(content=f"요청하신 이미지가 성공적으로 처리되었습니다.")
                        
                        # Return the image message instead of the original message
                        message_chunk = img_message

                    # Yield chunk and metadata
                    yield message_chunk, metadata
        except Exception as e:
            # if an exception occurs, log it
            logger.error(f"error occurred during model call: {str(e)}")
            
            # create error message
            error_message = AIMessage(content=f"{str(e)}")
            
            # set error metadata
            error_metadata = {
                "langgraph_node": "error",
                "langgraph_step": 0,
                "type": "error"
            }
            
            # send error message
            yield error_message, error_metadata
            return
        
        # Save final assistant message to history
        if last_chunk and isinstance(last_chunk, AIMessage):
            # print(f"last_chunk: {full_response}")
            self._add_assistant_message_to_history(thread_id, full_response)
    
    async def ainvoke(
        self, 
        input_state: InputState, 
        config: RunnableConfig,
        files: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Call the agent to generate a response
        
        Args:
            input_state: Input state
            config: Execution configuration
            files: List of file attachments (optional)
            
        Returns:
            Dictionary containing the agent response and message history
        """
        # process attachments
        attachments = []
        attachment_errors = []
        if files:
            try:
                logger.info(f"processing {len(files)} attachments")
                attachments, attachment_errors = await process_attachments(files)
                logger.info(f"attachment processing complete: {len(attachments)} successful, {len(attachment_errors)} errors")
                
                # if there are errors, log them
                for error in attachment_errors:
                    logger.warning(f"attachment error: {error}")
            except Exception as e:
                logger.error(f"error occurred during attachment processing: {str(e)}")
                attachment_errors.append("error occurred during attachment processing")
        
        # Get thread ID
        thread_id = self._get_thread_id(config)
        
        # if there are attachment errors, return them first
        if attachment_errors:
            error_content = f"error occurred during attachment processing:\n" + "\n".join(f"- {error}" for error in attachment_errors)
            error_message = AIMessage(content=error_content)
            
            # save error message and return
            self._add_assistant_message_to_history(thread_id, error_message)
            return {
                "messages": [error_message],
                "message_history": self.conversation_history[thread_id],
                "errors": attachment_errors
            }
        
        # Prepare conversation from history
        conversation = self._prepare_conversation(thread_id, input_state.messages)
        
        # if there are attachments, convert message format
        if conversation and isinstance(conversation[-1], HumanMessage) and attachments:
            last_message = conversation[-1]
            original_content = last_message.content
            
            # convert message with attachments
            formatted_message = create_message_with_attachments(original_content, attachments)
            
            # replace last message
            if isinstance(formatted_message, dict) and "content" in formatted_message:
                # convert to LangChain format (pass content array directly)
                conversation[-1] = HumanMessage(content=formatted_message["content"])
                logger.info("converted message with attachments (content array)")
            else:
                # if it's a string, use it as is
                conversation[-1] = HumanMessage(content=formatted_message)
                logger.info("converted message with attachments")
        
        # Update input state with prepared conversation
        input_state.messages = conversation
        
        # Invoke graph
        try:
            result = await self.graph.ainvoke(input_state, config)
            
            # Save assistant response to history
            if "messages" in result and result["messages"]:
                last_message = result["messages"][-1]
                if isinstance(last_message, AIMessage):
                    self._add_assistant_message_to_history(thread_id, last_message)
            
            # Include message history in result
            result["message_history"] = self.conversation_history[thread_id]
        except Exception as e:
            # if an exception occurs, log it
            logger.error(f"error occurred during model call: {str(e)}")
            
            # create error message
            error_message = AIMessage(content=f"{str(e)}")
            
            # add error message to conversation history
            self._add_assistant_message_to_history(thread_id, error_message)
            
            # return result with error message and history
            result = {
                "messages": [error_message],
                "message_history": self.conversation_history[thread_id],
                "error": str(e)
            }
            
        return result