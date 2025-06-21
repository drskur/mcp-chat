import { onMount } from "solid-js";
import { useTitleBar } from "@/components/layout/TitleBar";

export default function Settings() {
    const { setTitle } = useTitleBar();

    onMount(() => {
        setTitle("설정");
    });

    return (
        <div class="flex flex-col h-full w-full">
            <div class="max-w-3xl mx-auto w-full p-6">
                <div class="space-y-6">
                    {/* Settings sections will go here */}
                    <div class="rounded-lg border border-border p-6">
                        <h3 class="text-lg font-medium mb-4">일반 설정</h3>
                        <p class="text-sm text-muted-foreground">설정 항목들이 여기에 표시됩니다.</p>
                    </div>

                    <div class="rounded-lg border border-border p-6">
                        <h3 class="text-lg font-medium mb-4">MCP 서버 설정</h3>
                        <p class="text-sm text-muted-foreground">MCP 서버 관련 설정이 여기에 표시됩니다.</p>
                    </div>

                    <div class="rounded-lg border border-border p-6">
                        <h3 class="text-lg font-medium mb-4">모델 설정</h3>
                        <p class="text-sm text-muted-foreground">AI 모델 관련 설정이 여기에 표시됩니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}