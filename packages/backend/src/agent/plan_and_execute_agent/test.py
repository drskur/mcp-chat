#!/usr/bin/env python3
"""
PlanAndExecuteAgent 테스트 스크립트

이 스크립트는 PlanAndExecuteAgent의 기능을 테스트합니다.
다양한 쿼리로 에이전트를 실행할 수 있습니다.
"""

import os
import sys
import asyncio
import argparse
from dotenv import load_dotenv
from colorama import Fore, Style, init
import json
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# 현재 디렉토리를 추가하여 모듈 임포트 가능하게 함
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from src.agent.plan_and_execute_agent import PlanAndExecuteAgent
from langchain_core.messages import HumanMessage

# 환경 변수 로드
load_dotenv()

# 컬러 초기화
init(autoreset=True)

# MCP 설정 파일 경로
MCP_CONFIG_PATH = os.getenv("MCP_CONFIG_PATH", "../../mcp-config.json")

async def test_agent(query, model_id=None, max_tokens=4096, mcp_json_path=None, reload_prompt=False):
    """
    에이전트 테스트 함수

    Args:
        query: 사용자 쿼리
        model_id: 모델 ID
        max_tokens: 최대 토큰 수
        mcp_json_path: MCP 설정 파일 경로
        reload_prompt: 프롬프트 새로고침 여부
    """
    print(f"\n{Fore.CYAN}PlanAndExecuteAgent를 사용합니다. 모델: {model_id or '기본값'}, 최대 토큰: {max_tokens}{Style.RESET_ALL}")
    
    # MCP 서비스 초기화 확인
    try:
        print(f"{Fore.YELLOW}MCP 설정 파일 위치: {mcp_json_path}{Style.RESET_ALL}")
        if mcp_json_path and os.path.exists(mcp_json_path):
            with open(mcp_json_path, 'r') as f:
                mcp_config = json.load(f)
                print(f"{Fore.GREEN}MCP 설정 파일 로드 성공: {len(mcp_config.get('servers', []))} 서버 구성{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}MCP 설정 파일이 존재하지 않습니다: {mcp_json_path}{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}MCP 설정 파일 로드 오류: {str(e)}{Style.RESET_ALL}")
    
    # 에이전트 초기화
    agent = PlanAndExecuteAgent(model_id=model_id, max_tokens=max_tokens, mcp_json_path=mcp_json_path, reload_prompt=reload_prompt)
    
    # 쿼리 메시지 생성
    messages = [HumanMessage(content=query)]
    
    # 스트리밍 모드로 에이전트 실행
    print(f"\n{Fore.YELLOW}질문: {query}{Style.RESET_ALL}\n")
    print(f"{Fore.CYAN}응답 스트리밍:{Style.RESET_ALL}\n")
    
    # 에이전트에 쿼리 전송
    async for chunk, metadata in agent.astream(
        {"messages": messages},
        {"thread_id": "test-thread"}
    ):
        # 메타데이터 출력
        if hasattr(chunk, "content") and chunk.content:
            node_type = metadata.get("langgraph_node", "unknown")
            step = metadata.get("step", "?")
            phase = metadata.get("phase", "unknown")
            
            # 노드 유형에 따라 색상 지정
            color = Fore.WHITE
            if node_type == "planner":
                color = Fore.CYAN
            elif node_type == "execute": 
                color = Fore.GREEN
            elif node_type == "replan":
                color = Fore.YELLOW
            elif node_type == "final_report":
                color = Fore.MAGENTA
                
            # 청크 내용 출력
            print(f"{color}[{node_type}/{phase}/{step}] {chunk.content}{Style.RESET_ALL}")
    
    print(f"\n{Fore.GREEN}테스트 완료{Style.RESET_ALL}")

async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description="PlanAndExecuteAgent 테스트 스크립트")
    
    # 명령줄 인수 설정
    parser.add_argument("--query", type=str, default="파이썬으로 간단한 웹서버를 만드는 방법을 알려줘", help="테스트할 쿼리")
    parser.add_argument("--model", type=str, default=None, help="사용할 모델 ID")
    parser.add_argument("--max-tokens", type=int, default=4096, help="최대 토큰 수")
    parser.add_argument("--mcp-config", type=str, default=MCP_CONFIG_PATH, help="MCP 설정 파일 경로")
    parser.add_argument("--reload-prompt", action="store_true", help="프롬프트 새로고침 여부")
    
    # 인수 파싱
    args = parser.parse_args()
    
    # 에이전트 테스트 실행
    await test_agent(
        query=args.query,
        model_id=args.model,
        max_tokens=args.max_tokens,
        mcp_json_path=args.mcp_config,
        reload_prompt=args.reload_prompt
    )

if __name__ == "__main__":
    # 이벤트 루프 실행
    asyncio.run(main()) 