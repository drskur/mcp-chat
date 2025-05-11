export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { model_id } = body;
    
    if (!model_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '모델 ID가 제공되지 않았습니다.' 
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
    
    console.log(`모델 선택 요청을 API로 전달: ${apiUrl}/api/models/select`, model_id);

    const response = await fetch(`${apiUrl}/api/models/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model_id }),
    });

    if (!response.ok) {
      console.error(`API 응답 상태 코드: ${response.status}`);
      
      // 백엔드 API가 실패하면 실패 응답 제공
      return new Response(
        JSON.stringify({
          success: false,
          model_id: model_id,
          message: '모델 선택 저장에 실패했습니다.'
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
    console.error('모델 선택 저장 오류:', error);
    
    // 오류 발생 시 실패 응답 제공
    return new Response(
      JSON.stringify({
        success: false,
        message: '모델 선택 처리 중 오류가 발생했습니다.'
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