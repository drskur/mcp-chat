"""
LangGraph 에이전트 테스트 스크립트 - 스텝 단위로 표시하는 개선된 스트리밍 버전
ReactAgent와 PlanAndExecuteAgent 모두 테스트 가능

# ReactAgent 테스트
python tests/test.py --agent react

# PlanAndExecuteAgent 테스트
python tests/test.py --agent plan

# 특정 MCP 경로 지정
python tests/test.py --agent react --mcp-path /path/to/your/mcp_config.json

# 단순 테스트 (MCP 서비스 없이)
python tests/test.py --simple

"""
import os
import sys
import logging
import asyncio
import time
import json
import re
import argparse
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from colorama import Fore, Style, init
import traceback
from contextlib import asynccontextmanager

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 에이전트 클래스 가져오기
from src.agent.react_agent import ReactAgent
from src.agent.plan_and_execute_agent import PlanAndExecuteAgent
from src.common.configuration import Configuration
from src.agent.react_agent.state.model import InputState
from src.mcp_client.mcp_service import MCPService

# colorama 초기화
init(autoreset=True)

# 로깅 설정 - 필요한 로그만 표시하기 위해 WARNING 레벨로 설정
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# 중요한 모듈의 로그 레벨만 INFO로 설정
logging.getLogger("src.agent.agent").setLevel(logging.INFO)
logging.getLogger("src.agent.mcp.utils").setLevel(logging.INFO)
logging.getLogger("src.mcp_client.mcp_service").setLevel(logging.INFO)

# 환경변수 로드
load_dotenv()

# 기본 파일 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MCP_CONFIG_PATH = os.path.join(BASE_DIR, "config/mcp_config.json")
MCP_CONFIG_PATH = os.getenv("MCP_CONFIG_PATH", DEFAULT_MCP_CONFIG_PATH)

# MCP 구성 파일 존재 여부 확인
if not os.path.exists(MCP_CONFIG_PATH):
    print(f"{Fore.RED}경고: MCP 구성 파일을 찾을 수 없습니다: {MCP_CONFIG_PATH}{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}환경 변수 MCP_CONFIG_PATH를 설정하거나 config/mcp_config.json 파일을 생성하세요.{Style.RESET_ALL}")
    
    # 가능한 경로 검색
    potential_paths = [
        os.path.join(BASE_DIR, "mcp_config.json"),
        os.path.join(BASE_DIR, "..", "mcp_config.json"),
        os.path.join(BASE_DIR, "..", "..", "mcp_config.json"),
        os.path.join(BASE_DIR, "..", "..", "mcp.json"),
        "/workspaces/mcp-client/mcp.json"
    ]
    
    for path in potential_paths:
        if os.path.exists(path):
            MCP_CONFIG_PATH = path
            print(f"{Fore.GREEN}대체 MCP 구성 파일을 찾았습니다: {MCP_CONFIG_PATH}{Style.RESET_ALL}")
            break

# 전역 MCP 서비스 인스턴스
mcp_service = None

@asynccontextmanager
async def setup_mcp_service():
    """
    MCP 서비스 셋업 및 종료를 관리하는 비동기 컨텍스트 매니저
    """
    global mcp_service
    
    # MCP 서비스 초기화
    print(f"{Fore.CYAN}MCP 서비스 초기화 중... 경로: {MCP_CONFIG_PATH}{Style.RESET_ALL}")
    mcp_service = MCPService(MCP_CONFIG_PATH)
    
    try:
        # MCP 서비스 시작
        print(f"{Fore.CYAN}MCP 서비스 시작 중...{Style.RESET_ALL}")
        await mcp_service.startup()
        print(f"{Fore.GREEN}MCP 서비스 시작 완료{Style.RESET_ALL}")
        
        # 컨텍스트 제공
        yield mcp_service
        
    except Exception as e:
        print(f"{Fore.RED}MCP 서비스 시작 중 오류 발생: {str(e)}{Style.RESET_ALL}")
        if os.path.exists(MCP_CONFIG_PATH):
            with open(MCP_CONFIG_PATH, "r") as f:
                try:
                    config_content = f.read()
                    print(f"{Fore.YELLOW}MCP 구성 파일 내용 미리보기:{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}{config_content[:500]}...{Style.RESET_ALL}")
                except Exception as read_error:
                    print(f"{Fore.RED}구성 파일 읽기 오류: {str(read_error)}{Style.RESET_ALL}")
        yield None
    
    finally:
        # MCP 서비스 종료
        if mcp_service:
            try:
                print(f"{Fore.CYAN}MCP 서비스 종료 중...{Style.RESET_ALL}")
                await mcp_service.shutdown()
                print(f"{Fore.GREEN}MCP 서비스 종료 완료{Style.RESET_ALL}")
            except Exception as e:
                print(f"{Fore.RED}MCP 서비스 종료 중 오류 발생: {str(e)}{Style.RESET_ALL}")

# 유니코드 이스케이프 시퀀스를 실제 문자로 변환하는 함수
def unescape_unicode(s):
    if not isinstance(s, str):
        return s
    
    # 정규식을 사용하여 \\uXXXX 패턴을 찾음
    pattern = r'\\u([0-9a-fA-F]{4})'
    
    # 일치하는 패턴을 실제 유니코드 문자로 대체
    result = re.sub(pattern, lambda m: chr(int(m.group(1), 16)), s)
    return result

def print_step_header(step, node, triggers=None):
    """스텝 정보 헤더를 출력하는 함수"""
    print(f"\n{Fore.CYAN}===== LangGraph 스텝: {Fore.YELLOW}{step} {Fore.CYAN}| 노드: {Fore.YELLOW}{node} {Style.RESET_ALL} =====")
    if triggers:
        print(f"{Fore.CYAN}트리거: {Fore.YELLOW}{triggers}{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}-" * 50 + f"{Style.RESET_ALL}")


async def test_agent(agent_type="react", model_id=None, max_tokens=4096, reload_prompt=False):
    """
    에이전트 테스트 함수 - 스텝별 표시 개선 버전
    
    Args:
        agent_type: 에이전트 타입 ("react" 또는 "plan")
        model_id: 사용할 모델 ID
        max_tokens: 최대 토큰 수
        reload_prompt: 프롬프트 캐시 리로드 여부
    
    Returns:
        테스트 성공 여부 (bool)
    """
    # MCP 서비스 설정
    async with setup_mcp_service() as service:
        try:
            # MCP 구성 파일 상태 다시 확인
            if not os.path.exists(MCP_CONFIG_PATH):
                print(f"{Fore.RED}오류: MCP 구성 파일을 찾을 수 없어 테스트를 진행할 수 없습니다.{Style.RESET_ALL}")
                print(f"{Fore.YELLOW}환경 변수 MCP_CONFIG_PATH를 설정하거나 유효한 구성 파일을 생성하세요.{Style.RESET_ALL}")
                return False
            
            # 질문 설정
            query = "2 더하기 3 계산해줘"
            # query = "/Users/yunwoong/Desktop/aws-nova-canvas/image_20250502_152422.png 파일 보여줘"
            print(f"\n{Fore.CYAN}질문: {Fore.YELLOW}{query}{Style.RESET_ALL}\n")
            
            # 시스템 프롬프트 설정
            system_prompt = "당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 답변해주세요."
            
            # 메시지 생성
            messages = [HumanMessage(content=query)]
            
            # 스레드 ID 설정
            thread_id = f"test_thread_{int(time.time())}"

            # 실행 구성 생성
            config = RunnableConfig(
                configurable={
                    "Configuration": Configuration(
                        system_prompt=system_prompt,
                        mcp_tools=MCP_CONFIG_PATH,
                    ),
                    "thread_id": thread_id
                }
            )
            
            # 입력 상태 생성
            input_state = InputState(messages=messages)
            
            # 단계 및 추적 데이터 초기화
            current_tool_name = ""
            search_query = ""
            
            # 메시지 수집 버퍼
            response_buffer = ""
            
            # 단계 추적용 변수
            last_step = None
            last_node = None
            step_content = ""
            step_start_time = time.time()
            steps_info = {}
            
            # JSON 등록 처리용 임시 버퍼
            json_buffer = ""
            
            # MCP 서비스 상태 확인
            if service:
                # MCP 서비스에서 도구 가져오기
                tools = service.get_tools()
                if tools:
                    print(f"{Fore.GREEN}MCP 서비스에서 {len(tools)}개의 도구를 찾았습니다.{Style.RESET_ALL}")
                else:
                    print(f"{Fore.YELLOW}경고: MCP 서비스에서 사용 가능한 도구가 없습니다.{Style.RESET_ALL}")
            else:
                print(f"{Fore.YELLOW}경고: MCP 서비스가 초기화되지 않았습니다. 도구 없이 진행합니다.{Style.RESET_ALL}")
            
            # 에이전트 인스턴스 생성
            try:
                if agent_type.lower() == "react":
                    print(f"\n{Fore.CYAN}ReactAgent를 사용합니다. 모델: {model_id or '기본값'}, 최대 토큰: {max_tokens}{Style.RESET_ALL}")
                    agent = ReactAgent(model_id=model_id, max_tokens=max_tokens, mcp_json_path=MCP_CONFIG_PATH, reload_prompt=reload_prompt)
                else:
                    print(f"\n{Fore.CYAN}PlanAndExecuteAgent를 사용합니다. 모델: {model_id or '기본값'}, 최대 토큰: {max_tokens}{Style.RESET_ALL}")
                    agent = PlanAndExecuteAgent(model_id=model_id, max_tokens=max_tokens, mcp_json_path=MCP_CONFIG_PATH, reload_prompt=reload_prompt)
                
                print(f"{Fore.GREEN}에이전트 초기화 성공{Style.RESET_ALL}")
            except Exception as e:
                print(f"{Fore.RED}에이전트 초기화 중 오류 발생: {str(e)}{Style.RESET_ALL}")
                return False
            
            # MCP 도구 경고 출력 (있는 경우만)
            if agent_type.lower() == "react" and hasattr(agent, "mcp_service"):
                tools = agent.mcp_service.get_tools()
                if not tools:
                    print(f"{Fore.YELLOW}경고: MCP 도구가 초기화되지 않았습니다. 도구를 사용하지 않고 계속합니다.{Style.RESET_ALL}")
                else:
                    print(f"{Fore.GREEN}MCP 도구 {len(tools)}개가 성공적으로 로드되었습니다.{Style.RESET_ALL}")
            
            # 스트리밍 수신
            try:
                async for chunk in agent.astream(
                    input_state, 
                    config,
                    stream_mode="messages"  # 메시지 모드로 스트리밍
                ):
                    if isinstance(chunk, tuple) and len(chunk) == 2:
                        message_chunk, metadata = chunk
                        
                        if hasattr(message_chunk, "content"):
                            content = message_chunk.content
                            langgraph_step = metadata.get("langgraph_step", "")
                            langgraph_node = metadata.get("langgraph_node", "")
                            langgraph_triggers = metadata.get("langgraph_triggers", "")
                            
                            # 스텝 키 생성
                            step_key = f"{langgraph_step}:{langgraph_node}"
                            if step_key != f"{last_step}:{last_node}" and langgraph_step and langgraph_node:
                                # 이전 단계의 실행 시간 기록
                                if last_step:
                                    step_end_time = time.time()
                                    steps_info[f"{last_step}:{last_node}"] = {
                                        "duration": step_end_time - step_start_time,
                                        "content_length": len(step_content)
                                    }
                                    step_content = ""
                                
                                # 새 단계의 시작 시간 기록
                                step_start_time = time.time()
                                print_step_header(langgraph_step, langgraph_node, langgraph_triggers)
                                
                                # 트리거와 노드에 따라 상태 전환
                                if langgraph_node == "agent" or langgraph_node == "call_model":
                                    print(f"{Fore.MAGENTA}[AI 응답:]{Style.RESET_ALL}")
                                elif langgraph_node == "tools":
                                    print(f"{Fore.GREEN}[Tool 결과:]{Style.RESET_ALL}")
                                elif langgraph_node == "planner":
                                    print(f"{Fore.YELLOW}[Planner 결과:]{Style.RESET_ALL}")
                                elif langgraph_node == "execute":
                                    print(f"{Fore.YELLOW}[Execute 결과:]{Style.RESET_ALL}")
                                elif langgraph_node == "replan":
                                    print(f"{Fore.YELLOW}[Replan 결과:]{Style.RESET_ALL}")
                                elif langgraph_node == "final_report":
                                    print(f"{Fore.YELLOW}[Final Report 결과:]{Style.RESET_ALL}")
                                
                                last_step = langgraph_step
                                last_node = langgraph_node
                            
                            # 내용이 리스트인 경우 (메시지 구조 분석)
                            if isinstance(content, list):
                                for item in content:
                                    item_brief = str(item)[:50] + "..." if len(str(item)) > 50 else str(item)
                                    step_content += item_brief + "\n"
                                    
                                    # 텍스트 유형 처리
                                    if isinstance(item, dict) and item.get("type") == "text":
                                        text = item.get("text", "")
                                        if text:
                                            # 텍스트 출력
                                            print(text, end="", flush=True)
                                            response_buffer += text
                                    
                                    # 도구 사용 처리
                                    elif isinstance(item, dict) and item.get("type") == "tool_use":
                                        if item.get("name"):
                                            current_tool_name = item.get("name", "")
                                            
                                            # 도구 호출 표시
                                            print(f"\n\n{Fore.CYAN}🛠️  도구 실행: {Fore.YELLOW}{current_tool_name}{Style.RESET_ALL}")
                                            print(f"{Fore.CYAN}└─ 입력:{Style.RESET_ALL}")

                                            # JSON 임시 버퍼 시작
                                            json_buffer = ""
                                        
                                        # 입력 저장
                                        input_data = item.get("input", "")
                                        if input_data and isinstance(input_data, str):
                                            json_buffer += input_data
                                            # 입력을 스트리밍 방식으로 표시
                                            print(f"{Fore.WHITE}{input_data}{Style.RESET_ALL}", end="", flush=True)
                            
                            # 도구 결과와 최종 응답 구분하여 처리
                            elif isinstance(content, str):
                                # 이미지 메타데이터가 있는 경우
                                if metadata.get("is_image", False) and metadata.get("image_data"):
                                    print(f"\n{Fore.MAGENTA}[이미지 데이터 수신됨] - {len(metadata.get('image_data', ''))} 바이트{Style.RESET_ALL}")
                                    step_content += f"[이미지 데이터: {len(metadata.get('image_data', ''))} 바이트]"
                                    continue
                                    
                                # 노드 타입이 'tools'이면 도구 결과로 처리
                                if langgraph_node == "tools":
                                    # JSON 버퍼에서 검색어 추출 시도 (가능한 경우)
                                    try:
                                        query_match = re.search(r'"query":\s*"([^"]+)"', json_buffer)
                                        if query_match:
                                            search_query = unescape_unicode(query_match.group(1))
                                            print(f"{Fore.BLUE}입력 쿼리: {Fore.YELLOW}\"{search_query}\"{Style.RESET_ALL}")
                                    except Exception as e:
                                        # 쿼리 추출 실패해도 계속 진행
                                        pass
                                    
                                    # 결과 요약 출력 (처음 몇 줄만)
                                    result_lines = content.split('\n')
                                    preview_lines = min(5, len(result_lines))
                                    
                                    print(f"{Fore.BLUE}결과 요약:{Style.RESET_ALL}")
                                    for i in range(preview_lines):
                                        line = result_lines[i].strip()
                                        if line:
                                            print(f"{Fore.GREEN}  {line}{Style.RESET_ALL}")
                                    
                                    # 더 많은 결과가 있으면 표시
                                    if len(result_lines) > preview_lines:
                                        print(f"{Fore.BLUE}  ... 결과 {len(result_lines) - preview_lines}줄 더 있음 ...{Style.RESET_ALL}")
                                    
                                    # 전체 내용 디버깅 가능하도록 표시 (옵션)
                                    print(f"{Fore.BLUE}전체 결과 길이: {len(content)} 문자{Style.RESET_ALL}")
                                    
                                    # 내용 저장
                                    step_content += content
                                    
                                # 노드 타입이 'call_model', 'agent', 'planner', 'execute', 'replan', 'final_report'인 경우 AI 응답으로 처리
                                elif langgraph_node in ["call_model", "agent", "planner", "execute", "replan", "final_report"]:
                                    # 메타데이터나 내부 상태 코드는 건너뛰기
                                    if "[][" not in content and "]]" not in content and not content.startswith("{"):
                                        print(content, end="", flush=True)
                                        response_buffer += content
                                        step_content += content
            
            except asyncio.CancelledError:
                print(f"{Fore.RED}스트리밍이 취소되었습니다.{Style.RESET_ALL}")
            
            # 마지막 스텝 실행 시간 기록
            if last_step:
                step_end_time = time.time()
                steps_info[f"{last_step}:{last_node}"] = {
                    "duration": step_end_time - step_start_time,
                    "content_length": len(step_content)
                }
            
            # 단계 구분선 출력
            print(f"\n{Fore.YELLOW}-------------------------------------------{Style.RESET_ALL}")
            
            # 실행 통계 출력
            print(f"\n{Fore.CYAN}=== 스텝 실행 통계 ==={Style.RESET_ALL}")
            for step_key, info in steps_info.items():
                step, node = step_key.split(":")
                print(f"{Fore.WHITE}스텝 {step} (노드: {node}) - 실행 시간: {info['duration']:.2f}초, 데이터 길이: {info['content_length']} 바이트{Style.RESET_ALL}")
            
            # 요약 통계 출력
            print(f"\n{Fore.CYAN}=== 실행 요약 ==={Style.RESET_ALL}")
            print(f"{Fore.WHITE}LLM 호출 수: {sum(1 for key in steps_info if 'agent' in key or 'call_model' in key)}{Style.RESET_ALL}")
            print(f"{Fore.WHITE}도구 호출 수: {sum(1 for key in steps_info if 'tools' in key)}{Style.RESET_ALL}")
            
            if agent_type.lower() == "plan":
                print(f"{Fore.WHITE}계획 단계 수: {sum(1 for key in steps_info if 'planner' in key)}{Style.RESET_ALL}")
                print(f"{Fore.WHITE}실행 단계 수: {sum(1 for key in steps_info if 'execute' in key)}{Style.RESET_ALL}")
                print(f"{Fore.WHITE}재계획 단계 수: {sum(1 for key in steps_info if 'replan' in key)}{Style.RESET_ALL}")
                print(f"{Fore.WHITE}최종 보고서 생성 수: {sum(1 for key in steps_info if 'final_report' in key)}{Style.RESET_ALL}")
            
            print(f"\n{Fore.CYAN}=== 에이전트 실행 완료 ==={Style.RESET_ALL}")
            return True
        
        except Exception as e:
            logger.error(f"오류 발생: {str(e)}")
            logger.error(traceback.format_exc())
            return False


async def main():
    """
    메인 함수 - 커맨드 라인 인자 처리
    """
    # 인자 파서 설정
    parser = argparse.ArgumentParser(description="LangGraph 에이전트 테스트 스크립트")
    parser.add_argument("--agent", choices=["react", "plan"], default="react", help="사용할 에이전트 타입 (react 또는 plan)")
    parser.add_argument("--model", type=str, help="사용할 모델 ID")
    parser.add_argument("--max-tokens", type=int, default=4096, help="최대 토큰 수")
    parser.add_argument("--reload-prompt", action="store_true", help="프롬프트 캐시 리로드 여부")
    parser.add_argument("--mcp-path", type=str, help="MCP 구성 파일 경로")
    parser.add_argument("--simple", action="store_true", help="단순 테스트 모드 (도구 호출 없이 기본 응답 생성)")
    
    # 명령줄 인자 파싱
    args = parser.parse_args()
    
    # MCP 파일 경로 설정 (명령줄에서 지정한 경우)
    if args.mcp_path:
        global MCP_CONFIG_PATH
        if os.path.exists(args.mcp_path):
            MCP_CONFIG_PATH = args.mcp_path
            print(f"{Fore.GREEN}MCP 구성 파일 경로 설정: {MCP_CONFIG_PATH}{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}지정한 MCP 구성 파일이 존재하지 않습니다: {args.mcp_path}{Style.RESET_ALL}")
            return
    
    # 단순 테스트 모드
    if args.simple:
        print(f"{Fore.CYAN}단순 테스트 모드로 실행합니다. 도구 호출 없이 기본 응답을 생성합니다.{Style.RESET_ALL}")
        await test_simple_response(agent_type=args.agent, model_id=args.model, max_tokens=args.max_tokens)
        return
    
    # 에이전트 테스트 실행
    success = await test_agent(
        agent_type=args.agent,
        model_id=args.model,
        max_tokens=args.max_tokens,
        reload_prompt=args.reload_prompt
    )
    
    if success:
        print(f"\n{Fore.GREEN}✅ {args.agent.upper()} 에이전트 테스트 성공!{Style.RESET_ALL}")
    else:
        print(f"\n{Fore.RED}❌ {args.agent.upper()} 에이전트 테스트 실패!{Style.RESET_ALL}")


async def test_simple_response(agent_type="react", model_id=None, max_tokens=4096):
    """
    단순 테스트 모드 - 도구 호출 없이 기본 응답만 테스트
    
    Args:
        agent_type: 에이전트 타입 ("react" 또는 "plan")
        model_id: 사용할 모델 ID
        max_tokens: 최대 토큰 수
    """
    from langchain_core.prompts import ChatPromptTemplate
    from src.common.llm import get_llm
    
    # 질문 설정
    query = "한국의 용인 오늘 날씨를 알려줘"
    
    # 메시지 템플릿 생성
    template = ChatPromptTemplate.from_messages([
        ("system", "당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 답변해주세요."),
        ("human", "{query}")
    ])
    
    # 모델 초기화
    model = get_llm(model_id=model_id, max_tokens=max_tokens)
    
    # 체인 생성
    chain = template | model
    
    print(f"\n{Fore.CYAN}질문: {Fore.YELLOW}{query}{Style.RESET_ALL}\n")
    print(f"{Fore.MAGENTA}[AI 응답:]{Style.RESET_ALL}")
    
    # 응답 생성 및 출력
    try:
        response = await chain.ainvoke({"query": query})
        if hasattr(response, "content"):
            print(response.content)
        else:
            print(response)
        print(f"\n{Fore.GREEN}✅ 단순 테스트 성공!{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}오류 발생: {str(e)}{Style.RESET_ALL}")
        print(f"\n{Fore.RED}❌ 단순 테스트 실패!{Style.RESET_ALL}")


if __name__ == "__main__":
    asyncio.run(main())