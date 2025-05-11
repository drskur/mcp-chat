export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { model_id } = body;
    
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';
    
    console.log(`에이전트 재초기화 요청을 API로 전달: ${apiUrl}/api/reinit`, model_id ? `모델: ${model_id}` : '기본 모델 사용');

    const response = await fetch(`${apiUrl}/api/reinit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model_id }),
    });

    if (!response.ok) {
      console.error(`API 응답 상태 코드: ${response.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          model_id: model_id || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
          max_tokens: 4096,
          message: '에이전트 재초기화에 실패했습니다.'
        }),
        {
          status: 500,
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
    console.error('에이전트 재초기화 오류:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        max_tokens: 4096,
        message: '에이전트 재초기화 처리 중 오류가 발생했습니다.'
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