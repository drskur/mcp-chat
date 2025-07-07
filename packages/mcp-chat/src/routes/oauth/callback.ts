import type { APIEvent } from "@solidjs/start/server";
import { getMCPManager } from "@/lib/mcp";
import { revalidate } from "@solidjs/router";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  console.log("OAuth callback received:", { code: !!code, state, error });

  try {
    // OAuth 에러 확인
    if (error) {
      console.error("OAuth error:", error);
      return new Response(null, {
        status: 302,
        headers: {
          Location:
            "/settings/mcp-servers?auth=error&message=" +
            encodeURIComponent(error),
        },
      });
    }

    // 필수 파라미터 확인
    if (!code) {
      console.error("No authorization code provided");
      return new Response(null, {
        status: 302,
        headers: {
          Location:
            "/settings/mcp-servers?auth=error&message=" +
            encodeURIComponent("인증 코드가 없습니다."),
        },
      });
    }

    if (!state) {
      console.error("No state parameter provided");
      return new Response(null, {
        status: 302,
        headers: {
          Location:
            "/settings/mcp-servers?auth=error&message=" +
            encodeURIComponent("상태 파라미터가 없습니다."),
        },
      });
    }

    // state 디코딩 및 검증
    let serverName: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, "base64").toString());
      const { serverName: name, timestamp } = decodedState;

      // 시간 검증 (10분 이내)
      const maxAge = 10 * 60 * 1000; // 10분
      if (Date.now() - timestamp > maxAge) {
        console.error("OAuth state expired");
        return new Response(null, {
          status: 302,
          headers: {
            Location:
              "/settings/mcp-servers?auth=error&message=" +
              encodeURIComponent("인증 요청이 만료되었습니다."),
          },
        });
      }

      serverName = name;
      console.log("OAuth callback for server:", serverName);
    } catch (err) {
      console.error("Invalid state parameter:", err);
      return new Response(null, {
        status: 302,
        headers: {
          Location:
            "/settings/mcp-servers?auth=error&message=" +
            encodeURIComponent("잘못된 상태 파라미터입니다."),
        },
      });
    }

    // MCP SDK를 통한 토큰 교환
    const mcpManager = getMCPManager();
    const success = await mcpManager.handleOAuthCallback(serverName, code);

    if (!success) {
      console.error("OAuth token exchange failed");
      return new Response(null, {
        status: 302,
        headers: {
          Location:
            "/settings/mcp-servers?auth=error&message=" +
            encodeURIComponent("토큰 교환에 실패했습니다."),
        },
      });
    }

    // MCP 서버 상태 새로고침
    console.log("Refreshing MCP connections after OAuth success...");
    await mcpManager.refreshConnections();

    // 캐시 무효화 및 재검증
    console.log("Revalidating MCP server status...");
    await revalidate(["mcpServerStatus", "mcpServerConfig"]);

    // 성공 시 설정 페이지의 MCP 서버 섹션으로 리디렉션 (상태 파라미터 없이)
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/settings/mcp-servers",
      },
    });
  } catch (err) {
    console.error("OAuth callback processing error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";

    return new Response(null, {
      status: 302,
      headers: {
        Location:
          "/settings#mcp-servers?auth=error&message=" +
          encodeURIComponent(errorMessage),
      },
    });
  }
}
