import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Loading from "@/components/layout/Loading";
import Sidebar from "@/components/layout/Sidebar";
import "./app.css";

export default function App() {

  return (
    <Router
      root={props => (
        <div class="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Page Content */}
          <main class="flex-1 overflow-auto">
            <Suspense fallback={<Loading />}>{props.children}</Suspense>
          </main>
        </div>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
