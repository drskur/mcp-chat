import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.content || !body.content.includes('system_prompt:')) {
      return new Response(
        JSON.stringify({
          error: 'system_prompt: 필드가 필요합니다',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';

    console.log(`시스템 프롬프트 저장 요청을 API로 전달: ${apiUrl}/api/prompt`);

    const response = await fetch(`${apiUrl}/api/prompt`, {
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
    console.error('시스템 프롬프트 저장 오류:', error);
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
