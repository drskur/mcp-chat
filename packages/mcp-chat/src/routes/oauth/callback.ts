import {revalidate, redirect} from "@solidjs/router";
import type {APIEvent} from "@solidjs/start/server";
import {refreshWorkflowGraph} from "@/lib/graph/workflow";
import {getMCPManager} from "@/lib/mcp";

export async function GET(event: APIEvent) {
    const url = new URL(event.request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("OAuth callback received:", {code: !!code, state, error});

    try {
        // OAuth 에러 확인
        if (error) {
            console.error("OAuth error:", error);
            return redirect("/settings/mcp-servers?auth=error&message=" + encodeURIComponent(error));
        }

        // 필수 파라미터 확인
        if (!code) {
            console.error("No authorization code provided");
            return redirect("/settings/mcp-servers?auth=error&message=" + encodeURIComponent("인증 코드가 없습니다."));
        }

        if (!state) {
            console.error("No state parameter provided");
            return redirect("/settings/mcp-servers?auth=error&message=" + encodeURIComponent("상태 파라미터가 없습니다."));
        }

        // state 디코딩 및 검증
        let serverName: string;
        try {
            const decodedState = JSON.parse(Buffer.from(state, "base64").toString());
            const {serverName: name, timestamp} = decodedState;

            // 시간 검증 (10분 이내)
            const maxAge = 10 * 60 * 1000; // 10분
            if (Date.now() - timestamp > maxAge) {
                console.error("OAuth state expired");
                return redirect("/settings/mcp-servers?auth=error&message=" + encodeURIComponent("인증 요청이 만료되었습니다."));
            }

            serverName = name;
            console.log("OAuth callback for server:", serverName);
        } catch (err) {
            console.error("Invalid state parameter:", err);
            return redirect("/settings/mcp-servers?auth=error&message=" + encodeURIComponent("잘못된 상태 파라미터입니다."));
        }

        // MCP SDK를 통한 토큰 교환
        console.log("----START Token Exchange----");
        const mcpManager = await getMCPManager();
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

        // 연결 새로고침을 먼저 수행
        console.log("Refreshing connections after OAuth...");
        await mcpManager.refreshConnections();

        // 워크플로우 그래프 새로고침
        await refreshWorkflowGraph();

        return redirect("/settings/mcp-servers");

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
