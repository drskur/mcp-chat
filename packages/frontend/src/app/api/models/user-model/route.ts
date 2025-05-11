export async function GET() {
  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';
    
    console.log(`사용자 모델 정보 요청을 API로 전달: ${apiUrl}/api/models/user-model`);

    const response = await fetch(`${apiUrl}/api/models/user-model`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`API 응답 상태 코드: ${response.status}`);
      
      // 백엔드 API가 실패하면 기본 모델 제공
      return new Response(
        JSON.stringify({
          model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
        }),
        {
          status: 200,
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
    console.error('사용자 모델 정보 조회 오류:', error);
    
    // 오류 발생 시 기본 모델 제공
    return new Response(
      JSON.stringify({
        model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
} 