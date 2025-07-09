// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { getMCPManager } from "@/lib/mcp";

// 서버 시작 시 MCPClientManager 전역 초기화
getMCPManager().then(() => {
  console.log("MCPClientManager globally initialized in entry-server");
}).catch(error => {
  console.error("Failed to initialize MCPClientManager in entry-server:", error);
});

export default createHandler(() => {
  return (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <link rel="icon" href="/favicon.ico" />
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  );
});
