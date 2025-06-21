import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Loading from "@/components/layout/Loading";
import Sidebar from "@/components/layout/Sidebar";
import { TitleBar, TitleBarProvider } from "@/components/layout/TitleBar";
import "./app.css";

export default function App() {

  return (
    <TitleBarProvider>
      <Router
        root={props => (
          <div class="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Page Content */}
            <main class="flex-1 flex flex-col overflow-hidden">
              {/* Title Bar */}
              <TitleBar />
              
              {/* Content Area */}
              <div class="flex-1 overflow-auto">
                <Suspense fallback={<Loading />}>{props.children}</Suspense>
              </div>
            </main>
          </div>
        )}
      >
        <FileRoutes />
      </Router>
    </TitleBarProvider>
  );
}
