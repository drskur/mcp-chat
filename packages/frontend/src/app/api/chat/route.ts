import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // URL에서 쿼리 파라미터 추출
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    
    if (!query) {
      return new Response(JSON.stringify({ error: '쿼리 파라미터가 필요합니다.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';
    console.log(`GET 요청을 API로 전달: ${apiUrl}/api/chat?query=${encodeURIComponent(query)}`);

    // SSE 스트림을 생성하여 응답
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 가상의 응답 데이터 생성 (실제로는 백엔드 API 연동)
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "안녕하세요! ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 500));
          
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "질문에 ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));
          
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "대한 ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "답변을 ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "드리겠습니다. ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "질문: ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "${query}", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 도구 사용 예시
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "tool_use", "name": "brave_web_search", "id": "tooluse_123456", "index": 1}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "tool_use"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));
          
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "tool_use", "input": "", "id": null, "index": 1}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "tool_use"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 200));
          
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "tool_use", "input": "{\\"query\\": \\"${query}\\"}}", "id": null, "index": 1}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 1, "type": "tool_use"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 500));

          // 도구 결과 예시
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "tool_result", "text": "검색 결과: ${query}에 대한 정보를 찾았습니다.", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "tools", "langgraph_step": 2, "type": "tool_result"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 추가 응답
          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "검색 결과를 ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 3, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "분석해보니 ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 3, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "${query}에 대한 ", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 3, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          controller.enqueue(encoder.encode(`data: {"chunk": [{"type": "text", "text": "정보는 다음과 같습니다.", "index": 0}], "toolCalls": null, "metadata": {"langgraph_node": "agent", "langgraph_step": 3, "type": "ai_response"}}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 300));

          // 종료 메시지
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('스트림 생성 중 오류 발생:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('GET 요청 처리 오류:', error);
    return new Response(
      JSON.stringify({
        error: '서버 내부 오류',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';
    
    // FormData 요청 처리
    if (contentType.includes('multipart/form-data')) {
      console.log('FormData 요청 처리 시작');
      
      // 원래 요청에서 FormData 추출
      const formData = await req.formData();
      
      // 디버깅: FormData 내용 로깅
      console.log('FormData 항목:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`- ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`- ${key}: ${value}`);
        }
      }
      
      // 백엔드 API에 요청 전달
      console.log(`FormData 요청을 API로 전달: ${apiUrl}/api/chat`);
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        console.error(`API 응답 오류 상태: ${response.status} ${response.statusText}`);
        
        // 오류 응답의 본문을 확인
        try {
          const errorBody = await response.text();
          console.error('오류 응답 본문:', errorBody);
        } catch (e) {
          console.error('오류 응답 본문을 읽을 수 없음:', e);
        }
        
        return new Response(
          JSON.stringify({
            error: `백엔드 API 오류: ${response.status} ${response.statusText}`,
          }),
          {
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }
      
      // 백엔드 응답을 그대로 클라이언트에 전달
      console.log('백엔드 응답 성공, 클라이언트에 전달 중');
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }
    
    // JSON 요청 처리 (기존 로직)
    const body = await req.json();
    console.log(`JSON 요청을 API로 전달: ${apiUrl}/api/chat`);

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`API 응답 오류 상태: ${response.status} ${response.statusText}`);
      
      try {
        const errorBody = await response.text();
        console.error('오류 응답 본문:', errorBody);
      } catch (e) {
        console.error('오류 응답 본문을 읽을 수 없음:', e);
      }
      
      return new Response(
        JSON.stringify({
          error: `백엔드 API 오류: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // 백엔드 응답을 그대로 클라이언트에 전달
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('채팅 라우트 오류:', error);
    return new Response(
      JSON.stringify({
        error: '서버 내부 오류',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
} 