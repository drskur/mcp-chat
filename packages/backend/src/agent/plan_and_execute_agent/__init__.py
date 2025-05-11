# src/agent/plan_and_execute_agent/__init__.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import Dict, List, Tuple, Union, Literal, cast, Any, Annotated, AsyncGenerator, Optional
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from contextlib import asynccontextmanager
import logging
import os
import sys
import ast
from datetime import datetime, timezone
from dotenv import load_dotenv
from colorama import Fore, Style, init

from src.common.llm import get_llm
from src.common.configuration import Configuration
from src.common.utils import process_attachments, create_message_with_attachments
from src.agent.plan_and_execute_agent.state.model import InputState, Plan, Action, Response
from langgraph.prebuilt import create_react_agent
from src.agent.plan_and_execute_agent.prompt import prompt_manager
from src.mcp_client.mcp_service import MCPService

'''
Note: The Plan-and-Execute agent is still under development.
Current status:
- Basic functionality is implemented but requires extensive testing
- Tool integration needs verification
- Multiple experiments and optimizations are pending
- Performance and reliability testing is ongoing
'''

# Logger setup
logger = logging.getLogger(__name__)

# Initialize colorama
init(autoreset=True)

# Create a memory saver 
memory = MemorySaver()

class PlanAndExecuteAgent:
    """
    LangGraph-based Plan and Execute agent class
    Implements a planning and execution workflow for complex tasks
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
        
        # 대화 이력 저장소 추가
        self.conversation_history = {}
        
        # 디버그 모드 설정
        self.debug_mode = os.getenv("DEBUG_MODE", "False").lower() == "true"
        
        if reload_prompt:
            # prompt cache clear
            prompt_manager.clear_cache()
            logger.info("prompt cache cleared")
        
        # Initialize MCP service
        self.mcp_service = MCPService(mcp_json_path)
        
        # Initialize the model chains
        self._initialize_chains()
        
        # Create graph
        self.graph = self._build_graph()
        self.graph.name = "Plan-and-Execute Agent"
    
    def _initialize_chains(self):
        """Initialize the model chains for planning, replanning, and reporting"""
        # Model with structured output
        self.planner_model = self.model.with_structured_output(Plan)
        self.replanner_model = self.model.with_structured_output(Action)
        self.final_reporter_model = self.model
        
        # Set chains based on prompt_manager
        self.planner_chain = self._planner_chain_with_prompt_manager
        self.replanner_chain = self._replanner_chain_with_prompt_manager
        self.final_reporter_chain = self._final_reporter_chain_with_prompt_manager
    
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
    
    async def _planner_chain_with_prompt_manager(self, input_dict, config):
        """
        Use prompt_manager to generate messages and create a plan using planner_model.
        input_dict contains 'messages' and 'tool_desc'.
        """
        # Extract necessary information from input_dict
        messages = input_dict.get("messages")
        
        # messages가 문자열인 경우, 그대로 사용 (이미 원시 쿼리가 전달됨)
        if isinstance(messages, str):
            message_content = messages
        # 아직도 메시지 배열인 경우 처리
        elif isinstance(messages, list) and len(messages) > 0:
            # For planner, we need the latest user message
            user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
            if user_messages:
                message_content = user_messages[-1].content if hasattr(user_messages[-1], 'content') else str(user_messages[-1])
            else:
                message_content = "사용자 요청을 분석하고 처리해주세요."
        else:
                message_content = "사용자 요청을 분석하고 처리해주세요."
        
        # 로깅 추가
        logger.info(f"Planner processing query: {message_content[:100]}...")
        
        # Get tool_desc from input_dict or use default value
        tool_desc = input_dict.get("tool_desc", "사용 가능한 도구가 없습니다.")
        
        if not message_content:
            raise ValueError("planner_chain에 필요한 messages 값이 누락되었습니다.")
        
        # Get current datetime for temporal awareness
        current_datetime = datetime.now(tz=timezone.utc).isoformat()
        
        # Create prompt messages with all required variables
        prompt_messages = prompt_manager.get_messages(
            "planner",
            messages=message_content,
            tool_desc=tool_desc,
            DATETIME=current_datetime
        )
        
        try:
            # Return structured output
            result = await self.planner_model.ainvoke(prompt_messages, config)
            
            # 반환된 결과가 Plan 객체인지 확인
            if result and isinstance(result, Plan):
                return result
                
            # 문자열이 반환되었고 리스트 형식으로 파싱할 수 있는지 확인
            if isinstance(result, dict) and "steps" in result:
                steps_content = result["steps"]
                if isinstance(steps_content, str):
                    # 문자열을 줄 단위로 분리하여 리스트로 변환
                    steps_lines = steps_content.strip().split("\n")
                    # 빈 줄 제거
                    steps_list = [line.strip() for line in steps_lines if line.strip()]
                    # 번호 제거 (예: "1. " 또는 "1)" 등)
                    cleaned_steps = []
                    for step in steps_list:
                        # 줄 시작 부분의 숫자와 구분자 제거
                        if step.strip() and step[0].isdigit():
                            parts = step.split(".", 1)
                            if len(parts) > 1:
                                cleaned_steps.append(parts[1].strip())
                            else:
                                # "." 없이 숫자만 있는 경우 또는 다른 구분자 사용
                                for sep in [")", ":", "-"]:
                                    parts = step.split(sep, 1)
                                    if len(parts) > 1:
                                        cleaned_steps.append(parts[1].strip())
                                        break
                                else:
                                    # 구분자를 찾지 못한 경우 원래 단계 사용
                                    cleaned_steps.append(step.strip())
                        else:
                            cleaned_steps.append(step.strip())
                    
                    # 정제된 단계들로 Plan 객체 생성
                    return Plan(steps=cleaned_steps)
                elif isinstance(steps_content, list):
                    # 이미 리스트인 경우 그대로 사용
                    return Plan(steps=steps_content)
            
            # 기본 계획 반환
            logger.warning("Failed to parse plan properly, using default steps")
            return Plan(steps=["사용자 요청 분석", "필요한 정보 수집", "결과 생성"])
            
        except Exception as e:
            logger.error(f"Error in planner chain: {str(e)}")
            # 기본 계획 반환
            return Plan(steps=["사용자 요청 분석", "필요한 정보 수집", "결과 생성"])
    
    async def _replanner_chain_with_prompt_manager(self, input_dict, config):
        """
        Use prompt_manager to generate replanner messages and create a result using replanner_model.
        input_dict contains 'messages', 'past_steps', 'plan'.
        """
        # Extract necessary information from input_dict
        messages = input_dict.get("messages")
        past_steps = input_dict.get("past_steps")
        plan = input_dict.get("plan")
        
        if not messages or past_steps is None or plan is None:
            raise ValueError("replanner_chain에 필요한 값이 누락되었습니다.")
        
        # Extract user message content if it's a list of messages
        if isinstance(messages, list):
            user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
            if user_messages:
                message_content = user_messages[-1].content if hasattr(user_messages[-1], 'content') else str(user_messages[-1])
            else:
                message_content = "사용자 요청을 분석하고 다음 단계를 결정해주세요."
        else:
            message_content = str(messages)
            
        # Get current datetime for temporal awareness
        current_datetime = datetime.now(tz=timezone.utc).isoformat()
        
        # Create prompt messages
        prompt_messages = prompt_manager.get_messages(
            "replanner",
            messages=message_content,
            past_steps=past_steps,
            plan=plan,
            DATETIME=current_datetime
        )
        
        # Return structured output
        return await self.replanner_model.ainvoke(prompt_messages, config)
    
    async def _final_reporter_chain_with_prompt_manager(self, input_dict, config):
        """
        Use prompt_manager to generate final report messages and create a result using final_reporter_model.
        input_dict contains 'messages', 'past_steps'.
        """
        # Extract necessary information from input_dict
        messages = input_dict.get("messages")
        past_steps = input_dict.get("past_steps")
        
        if not messages or past_steps is None:
            raise ValueError("final_reporter_chain에 필요한 값이 누락되었습니다.")
        
        # Extract user message content if it's a list of messages
        if isinstance(messages, list):
            user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
            if user_messages:
                message_content = user_messages[-1].content if hasattr(user_messages[-1], 'content') else str(user_messages[-1])
            else:
                message_content = "실행된 계획의 최종 보고서를 작성해주세요."
        else:
            message_content = str(messages)
            
        # Get current datetime for temporal awareness
        current_datetime = datetime.now(tz=timezone.utc).isoformat()
        
        # Create prompt messages
        prompt_messages = prompt_manager.get_messages(
            "final_report",
            messages=message_content,
            past_steps=past_steps,
            DATETIME=current_datetime
        )
        
        # Generate result using LLM and convert to string
        result = await self.final_reporter_model.ainvoke(prompt_messages, config)
        if isinstance(result, dict) and "content" in result:
            return result["content"]
        elif hasattr(result, "content"):
            return result.content
        else:
            return str(result)
    
    async def _execute_step(self, state: InputState, config: RunnableConfig) -> Dict[str, List[Tuple]]:
        """
        Use the agent executor to perform the given task and return the result
        
        Args:
            state: Current state
            config: Execution configuration
            
        Returns:
            Dictionary with execution results
        """
        # Get thread ID and update execution state
        thread_id = self._get_thread_id(config)
        self._update_execution_state(thread_id, "executing")
        
        current_step = self._get_current_step(thread_id)
        
        # Get the plan from the state
        plan = state.get("plan", [])
        if not plan:
            print(f"\n{Fore.RED}No steps to execute in plan{Style.RESET_ALL}")
            return {"past_steps": [("No steps to execute", "Plan is empty")]}
        
        # Format the current task
        current_task = plan[0]
        plan_str = "\n".join(f"{i+1}. {step}" for i, step in enumerate(plan))
        task_formatted = f"""For the following plan:
    {plan_str}

    You are tasked with executing [step 1. {current_task}]."""
        
        # Log execution phase
        print(f"\n{Fore.CYAN}===== Execution Phase (Step {current_step}) ====={Style.RESET_ALL}")
        print(f"{Fore.YELLOW}-" * 50 + f"{Style.RESET_ALL}\n")
        print(f"{Fore.MAGENTA}[Executing step: {Fore.YELLOW}{current_task}{Fore.MAGENTA}]{Style.RESET_ALL}")
        
        # 간단한 계산 단계 확인 및 직접 처리
        import re
        
        # 계산 패턴 확인
        calculation_pattern = re.compile(r'계산\s+수행|계산\s+결과|(\d+)\s*([\+\-\*\/])\s*(\d+)')
        matches = calculation_pattern.search(current_task)
        
        if "계산" in current_task.lower():
            try:
                # 사용자 쿼리에서 계산식 추출
                user_query = ""
                if isinstance(state["messages"], list):
                    for msg in reversed(state["messages"]):
                        if isinstance(msg, HumanMessage):
                            user_query = self._normalize_content(msg.content)
                            break
                else:
                    user_query = self._normalize_content(state["messages"])
                
                calc_matches = re.search(r'(\d+)\s*([\+\-\*\/])\s*(\d+)', user_query)
                if calc_matches:
                    # 계산식 추출 및 계산 수행
                    num1 = int(calc_matches.group(1))
                    operator = calc_matches.group(2)
                    num2 = int(calc_matches.group(3))
                    
                    result = None
                    if operator == '+':
                        result = num1 + num2
                    elif operator == '-':
                        result = num1 - num2
                    elif operator == '*':
                        result = num1 * num2
                    elif operator == '/':
                        result = num1 / num2 if num2 != 0 else "나눗셈 오류: 0으로 나눌 수 없습니다."
                    
                    # 결과 생성
                    result_content = f"{num1} {operator} {num2} = {result}"
                    
                    # 결과 로깅
                    print(f"\n{Fore.GREEN}[계산 결과]: {Style.RESET_ALL}{result_content}")
                    
                    # 과거 단계에 추가
                    past_step = (current_task, result_content)
                    if "past_steps" in state:
                        return {"past_steps": [past_step], "plan": plan[1:]}
                    else:
                        return {"past_steps": [past_step], "plan": plan[1:]}
            except Exception as e:
                logger.error(f"계산 처리 중 오류 발생: {str(e)}")
                # 에이전트로 폴백
        
        # Get MCP tools
        tools = self.mcp_service.get_tools()
        if not tools:
            logger.warning("MCP tools are not initialized. Continue with empty tool list.")
            tools = []
            
        # 도구 로깅 개선 - 서버별로 도구 분류
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
        
        try:
            # Get system prompt for execution
            system_prompt = prompt_manager.get_prompt(
                "execute",
                DATETIME=datetime.now(tz=timezone.utc).isoformat()
            )["system_prompt"]
            
            # Create message for execution
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=task_formatted)
            ]
            
            # Create ReAct agent for execution
            async with self._make_graph(tools) as agent:
                # Invoke agent with current task
                response = await agent.ainvoke(
                    {"messages": messages},
                    config
                )
                
                # Extract result from agent response
                if isinstance(response, dict) and "messages" in response:
                    result_message = response["messages"][-1]
                    result_content = result_message.content if hasattr(result_message, "content") else str(result_message)
                else:
                    result_content = str(response)
                
                # Log the result
                result_summary = result_content[:200] + "..." if len(result_content) > 200 else result_content
                print(f"\n{Fore.GREEN}[Execution result]: {Style.RESET_ALL}{result_summary}")
                
                # Add to past steps
                past_step = (current_task, result_content)
                if "past_steps" in state:
                    return {"past_steps": [past_step], "plan": plan[1:]}
                else:
                    return {"past_steps": [past_step], "plan": plan[1:]}
                
        except Exception as e:
            logger.error(f"Error during execution: {str(e)}")
            # If error occurs, add to past steps with error information
            error_message = f"Error during execution: {str(e)}"
            past_step = (current_task, error_message)
            return {"past_steps": [past_step], "plan": plan[1:]}

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
        self.execution_state[thread_id] = {"step": 0, "phase": "initial"}
        
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
        
        # 대화 이력에서 대화 준비
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
        
        # InputState는 딕셔너리처럼 다뤄져야 함
        input_dict = {"messages": conversation}
        
        # before streaming
        message_size = sys.getsizeof(str(input_dict))
        logger.debug(f"Sending message size: {message_size/1024:.2f} KB")
        
        print(f"\n{Fore.CYAN}=== Plan-and-Execute Agent execution started ==={Style.RESET_ALL}\n")
        
        # Last chunk for saving to history later
        last_chunk = None
        full_response = ""
        
        # Start streaming
        try:
            async for chunk in self.graph.astream(
                input_dict, 
                config,
                stream_mode=stream_mode
            ):
                # Process chunk and metadata
                if isinstance(chunk, tuple) and len(chunk) == 2:
                    message_chunk, metadata = chunk
                    
                    # Save last chunk
                    last_chunk = message_chunk
                    
                    # Process content if available
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
                                    else:
                                        pass
                                except Exception as e:
                                    logger.error(f"String to dictionary conversion error: {str(e)}")
                                    # if conversion fails, use the original string
                                    full_response += chunk_content
                    
                    # Add execution state information to metadata
                    if thread_id in self.execution_state:
                        current_step = self.execution_state[thread_id].get("step", 0)
                        current_phase = self.execution_state[thread_id].get("phase", "unknown")
                        
                        # Enhance metadata
                        metadata["step"] = current_step
                        metadata["phase"] = current_phase
                        
                    # Add node information if not present
                    if "langgraph_node" not in metadata:
                        current_phase = self.execution_state.get(thread_id, {}).get("phase", "unknown")
                        if current_phase == "planning":
                            metadata["langgraph_node"] = "planner"
                        elif current_phase == "executing":
                            metadata["langgraph_node"] = "execute"
                        elif current_phase == "replanning":
                            metadata["langgraph_node"] = "replan"
                        elif current_phase == "reporting":
                            metadata["langgraph_node"] = "final_report"
                    
                    # 이미지 처리
                    is_image = False
                    image_data = None
                    mime_type = None

                    if hasattr(message_chunk, "artifact") and message_chunk.artifact:
                        for artifact_item in message_chunk.artifact:
                            if hasattr(artifact_item, "type") and artifact_item.type == "image":
                                is_image = True
                                image_data = artifact_item.data
                                mime_type = getattr(artifact_item, "mimeType", "image/png")
                    
                    # 이미지가 발견되면 처리
                    if is_image and image_data:
                        # 메타데이터에 이미지 정보 추가
                        metadata["is_image"] = True
                        metadata["image_data"] = image_data
                        metadata["mime_type"] = mime_type
                        
                        # 특별한 이미지 메시지 생성
                        img_message = AIMessage(content=f"요청하신 이미지가 성공적으로 처리되었습니다.")
                        
                        # 원본 메시지 대신 이미지 메시지 반환
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
            Agent response
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
        
        # 대화 이력에서 대화 준비
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
        
        # InputState는 딕셔너리처럼 다뤄져야 함
        input_dict = {"messages": conversation}
        
        # Invoke graph
        try:
            result = await self.graph.ainvoke(input_dict, config)
            
            # 최종 응답을 대화 이력에 추가
            if "response" in result and result["response"]:
                self._add_assistant_message_to_history(thread_id, result["response"])
            
            # 대화 이력을 결과에 포함
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
    
    def _get_thread_id(self, config: RunnableConfig) -> str:
        """
        Extract thread ID from config with default fallback
        
        Args:
            config: Execution configuration
            
        Returns:
            Thread ID string
        """
        return config.get("thread_id", "default_thread")
    
    def _update_execution_state(self, thread_id: str, phase: str = None) -> None:
        """
        Update execution state for the given thread ID
        
        Args:
            thread_id: Thread identifier
            phase: Current execution phase
        """
        if thread_id not in self.execution_state:
            self.execution_state[thread_id] = {"step": 0, "phase": phase or "initial"}
        else:
            self.execution_state[thread_id]["step"] += 1
            if phase:
                self.execution_state[thread_id]["phase"] = phase
    
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

    def _tools_to_desc(self, tools: List) -> str:
        """
        Format tools into a description string for the prompt
        
        Args:
            tools: List of MCP tools
            
        Returns:
            Formatted tools description
        """
        if not tools:
            return "사용 가능한 도구가 없습니다."
        
        # Sort tools by name for consistent presentation
        tools_sorted = sorted(tools, key=lambda x: x.name if hasattr(x, "name") else "")
        
        # Generate description for each tool
        tool_descriptions = []
        for tool in tools_sorted:
            if hasattr(tool, "name") and hasattr(tool, "description"):
                # Format: name: description
                tool_descriptions.append(f"{tool.name}: {tool.description}")
        
        # Join all descriptions with newlines
        if tool_descriptions:
            return "다음 도구를 사용할 수 있습니다:\n\n" + "\n\n".join(tool_descriptions)
        else:
            return "사용 가능한 도구가 없습니다."
    
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
        
        # 시스템 프롬프트는 대화 조합 후에 추가
        # 따로 시스템 프롬프트를 설정하지 않고 빈 메시지 리스트로 시작
        conversation = []
        
        # add all messages in history
        for msg in self.conversation_history[thread_id]:
            content = self._normalize_content(msg["content"])
            if not content:
                continue
                
            if msg["role"] == "user":
                conversation.append(HumanMessage(content=content))
            elif msg["role"] == "assistant":
                conversation.append(AIMessage(content=content))
        
        # 처음 메시지가 없으면 입력 메시지 추가
        if not conversation and input_messages:
            for msg in input_messages:
                if isinstance(msg, HumanMessage):
                    conversation.append(msg)
        
        # 로깅
        if self.debug_mode:
            logger.info(f"conversation history: {len(self.conversation_history[thread_id])} messages")
            logger.info(f"configured conversation: {len(conversation)} messages")
            
        return conversation
        
    async def _load_mcp_tools(self, config: RunnableConfig) -> Dict:
        """Load MCP tools information"""
        # Use the MCPService directly
        tools = self.mcp_service.get_tools()
        if not tools:
            logger.warning("MCP tools are not initialized. Continue with empty tool list.")
            return {}
        
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
            
        return tools

    def _log_conversation_debug(self, conversation: List[BaseMessage]) -> None:
        """
        Log debug information about the conversation
        
        Args:
            conversation: Conversation messages to log
        """
        if self.debug_mode:
            logger.info(f"Sending {len(conversation)} messages")
            for i, msg in enumerate(conversation):
                content = self._normalize_content(msg.content)
                logger.info(
                    f"Message {i}: {type(msg).__name__}, "
                    f"Content length: {len(content)}, "
                    f"Type: {type(msg.content)}"
                )
    
    async def _plan_step(self, state: InputState, config: RunnableConfig) -> Dict[str, List[str]]:
        """
        사용자 입력을 기반으로 계획을 생성
        
        Args:
            state: 현재 상태
            config: 실행 설정
            
        Returns:
            계획 단계 목록을 포함하는 딕셔너리
        """
        # 스레드 ID 가져오기 및 실행 상태 업데이트
        thread_id = self._get_thread_id(config)
        self._update_execution_state(thread_id, "planning")
        
        # 현재 단계 로깅
        current_step = self._get_current_step(thread_id)
        
        try:
            # 사용자 쿼리 추출
            user_query = ""
            if isinstance(state["messages"], list):
                # 최신 사용자 메시지 찾기
                for msg in reversed(state["messages"]):
                    if isinstance(msg, HumanMessage):
                        user_query = self._normalize_content(msg.content)
                        break
                
                if not user_query:
                    logger.warning("메시지에서 사용자 쿼리를 찾을 수 없습니다")
                    user_query = "사용자 요청을 분석하고 처리해주세요"
            else:
                # 리스트가 아닌 경우 문자열로 변환
                user_query = self._normalize_content(state["messages"])
            
            logger.info(f"계획 생성 중: {user_query}")
            
            # 계획 단계 로깅
            print(f"\n{Fore.CYAN}===== 계획 단계 (단계 {current_step}) ====={Style.RESET_ALL}")
            print(f"{Fore.YELLOW}-" * 50 + f"{Style.RESET_ALL}\n")
            print(f"{Fore.MAGENTA}[다음 쿼리에 대한 계획 생성: {Fore.YELLOW}{user_query[:100]}...{Fore.MAGENTA}]{Style.RESET_ALL}")
            
            # 간단한 계산 쿼리인지 확인
            import re
            calculation_pattern = re.compile(r'(\d+)\s*([\+\-\*\/])\s*(\d+)')
            matches = calculation_pattern.search(user_query)
            
            if matches:
                # 간단한 계산 쿼리에 대한 단순 계획
                logger.info("간단한 계산 쿼리 감지, 적절한 계획 생성")
                operation_map = {'+': '더하기', '-': '빼기', '*': '곱하기', '/': '나누기'}
                operation = matches.group(2)
                operation_text = operation_map.get(operation, operation)
                
                return {
                    "plan": [
                        f"사용자의 {matches.group(1)}와 {matches.group(3)}의 {operation_text} 계산 수행",
                        f"계산 결과 제공"
                    ],
                    "past_steps": []
                }
            
            # MCP 도구 가져오기
            tools = self.mcp_service.get_tools()
            if not tools:
                logger.warning("MCP 도구가 초기화되지 않았습니다. 빈 도구 목록으로 계속합니다.")
                tools = []
            
            # 도구 설명 생성
            tool_desc = self._tools_to_desc(tools)
            
            # 계획 모델 호출
            prompt_messages = prompt_manager.get_messages(
                "planner",
                messages=user_query,
                tool_desc=tool_desc,
                DATETIME=datetime.now(tz=timezone.utc).isoformat()
            )
            
            # 구조화된 출력으로 계획 생성
            raw_plan = await self.planner_model.ainvoke(prompt_messages, config)
            
            # 계획 처리 및 단계 추출
            if raw_plan and hasattr(raw_plan, "steps"):
                # 계획 단계 추출
                plan_steps = raw_plan.steps
                
                # 계획 단계에 플레이스홀더가 있으면 처리
                if hasattr(raw_plan, "process_placeholders"):
                    processed_plan = raw_plan.process_placeholders({"messages": user_query})
                    plan_steps = processed_plan.steps
                
                # 계획 타당성 검증
                if not self._is_plan_relevant(user_query, plan_steps):
                    logger.warning("생성된 계획이 쿼리와 관련이 없을 수 있습니다. 기본 계획으로 대체합니다.")
                    
                    # 쿼리 유형에 따른 기본 계획 생성
                    if "계산" in user_query or any(op in user_query for op in ["+", "-", "*", "/"]):
                        plan_steps = ["사용자의 계산 요청 분석", "계산 수행", "결과 제공"]
                    else:
                        plan_steps = ["사용자 요청 분석", "필요한 정보 수집", "결과 생성"]
                
                # 생성된 계획 로깅
                print(f"\n{Fore.GREEN}생성된 계획 ({len(plan_steps)}단계):{Style.RESET_ALL}")
                for i, step in enumerate(plan_steps):
                    print(f"{Fore.YELLOW}{i+1}.{Style.RESET_ALL} {step}")
                
                # 계획 반환
                return {"plan": plan_steps, "past_steps": []}
            else:
                # 구조화된 출력 파싱 실패시 기본 계획 생성
                logger.warning("계획을 제대로 파싱할 수 없습니다. 기본 계획 사용")
                default_plan = ["사용자 요청 분석", "정보 수집", "결과 생성"]
                return {"plan": default_plan, "past_steps": []}
        
        except Exception as e:
            logger.error(f"계획 단계 중 오류 발생: {str(e)}")
            # 오류 발생 시 기본 계획 생성
            fallback_plan = ["사용자 요청 분석", "필요한 정보 수집", "결과 생성"]
            return {"plan": fallback_plan, "past_steps": []}
    
    def _is_plan_relevant(self, query: str, plan_steps: List[str]) -> bool:
        """
        생성된 계획이 쿼리와 관련이 있는지 검증
        
        Args:
            query: 사용자 쿼리
            plan_steps: 생성된 계획 단계 목록
            
        Returns:
            계획이 관련성이 있으면 True, 그렇지 않으면 False
        """
        # 쿼리에 있는 주요 키워드 추출
        query_lower = query.lower()
        keywords = set()
        
        # 계산 관련 키워드
        if any(op in query for op in ["+", "-", "*", "/", "더하기", "빼기", "곱하기", "나누기", "계산"]):
            keywords.update(["계산", "결과", "더하기", "빼기", "곱하기", "나누기", "합", "차", "곱", "몫"])
        
        # 검색 관련 키워드
        if any(term in query_lower for term in ["찾아", "검색", "알려줘", "뭐야", "무엇"]):
            keywords.update(["검색", "찾기", "정보", "분석"])
        
        # 각 계획 단계에서 키워드 체크
        relevant_steps = 0
        for step in plan_steps:
            step_lower = step.lower()
            if any(keyword in step_lower for keyword in keywords):
                relevant_steps += 1
        
        # 관련성 있는 단계가 최소 비율 이상이면 관련성 있다고 판단
        relevance_threshold = 0.3  # 최소 30%의 단계가 관련성이 있어야 함
        return (relevant_steps / len(plan_steps)) >= relevance_threshold if plan_steps else False
    
    async def _replan_step(self, state: InputState, config: RunnableConfig) -> Dict:
        """
        이전 단계의 결과를 바탕으로 계획 업데이트 또는 최종 응답 반환
        
        Args:
            state: 현재 상태
            config: 실행 설정
            
        Returns:
            업데이트된 계획 또는 최종 응답
        """
        # 스레드 ID 가져오기 및 실행 상태 업데이트
        thread_id = self._get_thread_id(config)
        self._update_execution_state(thread_id, "replanning")
        
        current_step = self._get_current_step(thread_id)
        
        try:
            # 사용자 쿼리 추출
            user_query = ""
            if isinstance(state["messages"], list):
                for msg in reversed(state["messages"]):
                    if isinstance(msg, HumanMessage):
                        user_query = self._normalize_content(msg.content)
                        break
                
                if not user_query:
                    user_query = "사용자 요청을 분석하고 다음 단계를 결정해주세요."
            else:
                user_query = self._normalize_content(state["messages"])
            
            # 이전 단계 포맷팅
            past_steps_formatted = "\n\n".join([
                f"질문: {past_step[0]}\n\n답변: {past_step[1]}\n\n####"
                for past_step in state.get("past_steps", [])
            ])
            
            # 남은 계획 포맷팅
            plan = state.get("plan", [])
            plan_formatted = "\n".join(f"{i+1}. {step}" for i, step in enumerate(plan))
            
            # 재계획 단계 로깅
            print(f"\n{Fore.CYAN}===== 재계획 단계 (단계 {current_step}) ====={Style.RESET_ALL}")
            print(f"{Fore.YELLOW}-" * 50 + f"{Style.RESET_ALL}\n")
            print(f"{Fore.MAGENTA}[진행 상황 평가 및 계획 업데이트 중...]{Style.RESET_ALL}")
            
            # 재계획 프롬프트 생성
            prompt_messages = prompt_manager.get_messages(
                "replanner",
                messages=user_query,
                past_steps=past_steps_formatted,
                plan=plan_formatted,
                DATETIME=datetime.now(tz=timezone.utc).isoformat()
            )
            
            # 재계획 모델 호출
            act_result = await self.replanner_model.ainvoke(prompt_messages, config)
            
            # 결과에 따라 분기 처리
            if hasattr(act_result, "action"):
                if isinstance(act_result.action, Response):
                    # 최종 응답 반환
                    return {"response": act_result.action.response, "plan": []}
                else:
                    # 계획 업데이트
                    next_plan = act_result.action.steps
                    if len(next_plan) == 0:
                        return {"response": "더 이상 필요한 단계가 없습니다. 작업이 완료되었습니다.", "plan": []}
                    else:
                        print(f"\n{Fore.GREEN}계획 실행 계속: {len(next_plan)} 단계 남음{Style.RESET_ALL}")
                        for i, step in enumerate(next_plan):
                            print(f"{Fore.YELLOW}{i+1}.{Style.RESET_ALL} {step}")
                        return {"plan": next_plan}
            
            # 재계획 결과가 없거나 구조가 유효하지 않은 경우
            if plan:  # 남은 단계가 있으면 계속 실행
                print(f"\n{Fore.GREEN}계획 실행 계속: {len(plan)} 단계 남음{Style.RESET_ALL}")
                for i, step in enumerate(plan):
                    print(f"{Fore.YELLOW}{i+1}.{Style.RESET_ALL} {step}")
                return {"plan": plan}
            
            # 남은 단계가 없으면 완료 처리
            print(f"\n{Fore.GREEN}계획 실행 완료. 최종 응답 생성 중...{Style.RESET_ALL}")
            
            # 최종 응답 생성
            final_response = f"작업 완료.\n\n실행된 단계:\n{past_steps_formatted}"
            return {"response": final_response, "plan": []}
        
        except Exception as e:
            logger.error(f"재계획 중 오류 발생: {str(e)}")
            # 오류 발생 시 간단한 폴백 응답 생성
            return {"response": "작업을 완료했습니다. 정보를 분석하고 결과를 제공했습니다.", "plan": []}
    
    def _should_end(self, state: InputState) -> Literal["execute", "final_report"]:
        """
        에이전트가 실행을 종료할지 결정
        
        Args:
            state: 현재 상태
            
        Returns:
            다음에 취할 행동
        """
        # 응답이 이미 존재하거나 남은 계획이 없으면 final_report로 전환
        if "response" in state or not state.get("plan"):
            logger.info("응답이 이미 존재하거나 남은 계획이 없음: final_report로 전환")
            return "final_report"
        else:
            # 남은 단계가 있으면 실행 계속
            logger.info(f"계획에 {len(state.get('plan', []))} 단계 남음: 실행 계속")
            return "execute"
    
    def _build_graph(self) -> StateGraph:
        """
        Plan-and-Execute 에이전트 그래프 생성
        
        Returns:
            StateGraph 객체
        """
        # 그래프 정의
        builder = StateGraph(InputState, input=InputState, config_schema=Configuration)
    
        # 노드 정의
        builder.add_node("planner", self._plan_step)
        builder.add_node("execute", self._execute_step)
        builder.add_node("replan", self._replan_step)
        builder.add_node("final_report", self._generate_final_report)
    
        # 기본 에지 정의
        builder.add_edge(START, "planner")
        builder.add_edge("planner", "execute")
        builder.add_edge("execute", "replan")
        
        # 조건부 에지 정의
        builder.add_conditional_edges(
            "replan",
            self._should_end,
            {"execute": "execute", "final_report": "final_report"}
        )
        
        builder.add_edge("final_report", END)
    
        # 체크포인터를 사용하여 상태 관리로 그래프 컴파일
        graph = builder.compile(
            checkpointer=memory,
            interrupt_before=["replan"],  # 재계획 단계 전에 중단
            interrupt_after=["execute"],  # 실행 단계 후에 중단
        )
        
        return graph

    async def _generate_final_report(self, state: InputState, config: RunnableConfig) -> Dict[str, str]:
        """
        최종 보고서 생성 단계
        
        Args:
            state: 현재 상태
            config: 실행 설정
            
        Returns:
            최종 응답을 포함하는 딕셔너리
        """
        # 스레드 ID 가져오기 및 실행 상태 업데이트
        thread_id = self._get_thread_id(config)
        self._update_execution_state(thread_id, "reporting")
        
        current_step = self._get_current_step(thread_id)
        
        # 응답이 이미 상태에 있으면 반환
        if "response" in state and state["response"]:
            return {"response": state["response"]}
        
        try:
            # 사용자 쿼리 추출
            user_query = ""
            if isinstance(state["messages"], list):
                for msg in reversed(state["messages"]):
                    if isinstance(msg, HumanMessage):
                        user_query = self._normalize_content(msg.content)
                        break
            else:
                user_query = self._normalize_content(state["messages"])
                
            # 계산 쿼리인지 확인
            import re
            calculation_pattern = re.compile(r'(\d+)\s*([\+\-\*\/])\s*(\d+)')
            calc_matches = calculation_pattern.search(user_query)
            
            # 과거 단계 가져오기
            past_steps = state.get("past_steps", [])
            
            # 간단한 계산 쿼리인 경우 직접 결과 생성
            if calc_matches and past_steps:
                for task, result in past_steps:
                    if "계산 결과" in result or "=" in result:
                        # 계산 결과에서 최종 결과만 추출
                        result_match = re.search(r'=\s*(\d+\.?\d*|[^=]+)', result)
                        if result_match:
                            final_result = result_match.group(1).strip()
                            
                            # 결과 생성
                            response = f"결과: {final_result}"
                            
                            print(f"\n{Fore.CYAN}===== Final Report ====={Style.RESET_ALL}")
                            print(f"{Fore.YELLOW}-" * 50 + f"{Style.RESET_ALL}\n")
                            print(f"{Fore.GREEN}[최종 응답]{Style.RESET_ALL}\n{response}")
                            
                            return {"response": response}
                        
                        # 계산 결과가 있지만 형식이 다른 경우
                        print(f"\n{Fore.CYAN}===== Final Report ====={Style.RESET_ALL}")
                        print(f"{Fore.YELLOW}-" * 50 + f"{Style.RESET_ALL}\n")
                        print(f"{Fore.GREEN}[최종 응답]{Style.RESET_ALL}\n{result}")
                        
                        return {"response": result}
            
            # 일반적인 보고서 생성
            # 계획 및 수행된 단계 요약
            planned_steps = state.get("plan", [])
            all_steps = []
            
            # 완료된 단계와 결과 추가
            for step_desc, step_result in past_steps:
                result_summary = step_result[:150] + "..." if len(step_result) > 150 else step_result
                all_steps.append(f"✅ {step_desc}\n   🔹 결과: {result_summary}")
            
            # 남은 단계 추가
            for step in planned_steps:
                all_steps.append(f"⏳ {step}")
            
            all_steps_text = "\n".join(all_steps)
            
            # 마크다운 형식의 최종 보고서 생성 프롬프트 가져오기
            prompt_messages = prompt_manager.get_messages(
                "final_report",
                messages=user_query,
                past_steps=all_steps_text,
                DATETIME=datetime.now(tz=timezone.utc).isoformat()
            )
            
            # 최종 보고서 생성
            response = await self.final_reporter_model.ainvoke(prompt_messages, config)
            
            # 결과 로깅
            print(f"\n{Fore.CYAN}===== Final Report ====={Style.RESET_ALL}")
            print(f"{Fore.YELLOW}-" * 50 + f"{Style.RESET_ALL}\n")
            print(f"{Fore.GREEN}[Final Response]{Style.RESET_ALL}\n{response}")
            
            return {"response": response}
            
        except Exception as e:
            logger.error(f"최종 보고서 생성 중 오류 발생: {str(e)}")
            
            # 오류 발생 시 기본 응답으로 폴백
            return {"response": "처리 중 문제가 발생했습니다. 나중에 다시 시도해주세요."}