import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';

    console.log(`MCP 도구 추가 요청을 API로 전달: ${apiUrl}/api/mcp-tools`);

    const response = await fetch(`${apiUrl}/api/mcp-tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`API 응답 상태 코드: ${response.status}`);
      return new Response(
        JSON.stringify({
          error: `백엔드 API 응답 오류: ${response.status}`,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('MCP 도구 추가 오류:', error);
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


export async function PUT(req: NextRequest) {
  try {
    const { pathname } = new URL(req.url);
    const toolName = pathname.split('/').pop();

    if (!toolName) {
      return new Response(
        JSON.stringify({
          error: '도구 이름이 필요합니다',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const body = await req.json();

    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';

    console.log(
      `[MCP Tools API] 도구 수정 요청을 API로 전달: ${apiUrl}/api/mcp-tools/${encodeURIComponent(toolName)}`,
    );

    const response = await fetch(
      `${apiUrl}/api/mcp-tools/${encodeURIComponent(toolName)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      console.error(`[MCP Tools API] 백엔드 API 응답 오류: ${response.status}`);
      return new Response(
        JSON.stringify({
          error: `백엔드 API 응답 오류: ${response.status}`,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const data = await response.json();
    console.log(`[MCP Tools API] 도구 수정 성공: ${body.name}`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[MCP Tools API] MCP 도구 수정 오류:', error);
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
