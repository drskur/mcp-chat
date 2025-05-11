export async function GET() {
  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';
    
    console.log(`모델 목록 요청을 API로 전달: ${apiUrl}/api/models`);

    const response = await fetch(`${apiUrl}/api/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`API 응답 상태 코드: ${response.status}`);
      
      // 백엔드 API가 실패하면 임시 목업 데이터 제공
      return new Response(
        JSON.stringify({
          providers: [
            {
              id: 'anthropic',
              name: 'Anthropic',
              icon_url: '/logos/anthropic.png',
              models: [
                {
                  id: 'claude-3-sonnet',
                  name: 'Claude 3 Sonnet',
                  provider: 'anthropic',
                  provider_name: 'Anthropic',
                  icon_url: '/logos/claude.png',
                  provider_icon_url: '/logos/anthropic.png',
                  capabilities: {
                    text: true,
                    image: true,
                    code: true,
                  },
                  max_output_tokens: 100000,
                },
                {
                  id: 'claude-3-opus',
                  name: 'Claude 3 Opus',
                  provider: 'anthropic',
                  provider_name: 'Anthropic',
                  icon_url: '/logos/claude.png',
                  provider_icon_url: '/logos/anthropic.png',
                  capabilities: {
                    text: true,
                    image: true,
                    code: true,
                  },
                  max_output_tokens: 150000,
                },
                {
                  id: 'claude-3-haiku',
                  name: 'Claude 3 Haiku',
                  provider: 'anthropic',
                  provider_name: 'Anthropic',
                  icon_url: '/logos/claude.png',
                  provider_icon_url: '/logos/anthropic.png',
                  capabilities: {
                    text: true,
                    image: true,
                    code: true,
                  },
                  max_output_tokens: 75000,
                },
              ]
            },
            {
              id: 'amazon',
              name: 'Amazon',
              icon_url: '/logos/amazon.png',
              models: [
                {
                  id: 'titan-text',
                  name: 'Titan Text',
                  provider: 'amazon',
                  provider_name: 'Amazon',
                  icon_url: '/logos/titan.png',
                  provider_icon_url: '/logos/amazon.png',
                  capabilities: {
                    text: true,
                    image: false,
                    code: true,
                  },
                  max_output_tokens: 8096,
                }
              ]
            }
          ]
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
    console.error('모델 목록 조회 오류:', error);
    
    // 오류 발생 시 임시 목업 데이터 제공
    return new Response(
      JSON.stringify({
        providers: [
          {
            id: 'anthropic',
            name: 'Anthropic',
            icon_url: '/logos/anthropic.png',
            models: [
              {
                id: 'claude-3-sonnet',
                name: 'Claude 3 Sonnet',
                provider: 'anthropic',
                provider_name: 'Anthropic',
                icon_url: '/logos/claude.png',
                provider_icon_url: '/logos/anthropic.png',
                capabilities: {
                  text: true,
                  image: true,
                  code: true,
                },
                max_output_tokens: 100000,
              },
              {
                id: 'claude-3-opus',
                name: 'Claude 3 Opus',
                provider: 'anthropic',
                provider_name: 'Anthropic',
                icon_url: '/logos/claude.png',
                provider_icon_url: '/logos/anthropic.png',
                capabilities: {
                  text: true,
                  image: true,
                  code: true,
                },
                max_output_tokens: 150000,
              },
              {
                id: 'claude-3-haiku',
                name: 'Claude 3 Haiku',
                provider: 'anthropic',
                provider_name: 'Anthropic',
                icon_url: '/logos/claude.png',
                provider_icon_url: '/logos/anthropic.png',
                capabilities: {
                  text: true,
                  image: true, 
                  code: true,
                },
                max_output_tokens: 75000,
              },
            ]
          }
        ]
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
