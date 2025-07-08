import { type Component, createEffect, createSignal, Show } from "solid-js";
import Loading from "@/components/layout/Loading";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/textarea";
import { TextFieldLabel, TextFieldRoot } from "@/components/ui/textfield";

interface McpServerJsonEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpServers: unknown;
  onConfigChange: (config: Record<string, unknown>) => Promise<void>;
}

const sampleMCPConfig = {
  "ddg-search": {
    command: "uvx",
    args: ["duckduckgo-mcp-server"],
    transport: "stdio",
  },
};

const McpServerJsonEditor: Component<McpServerJsonEditorProps> = (props) => {
  const [jsonValue, setJsonValue] = createSignal("");
  const [jsonError, setJsonError] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);

  // props.open이 true가 될 때 JSON 값을 초기화
  createEffect(() => {
    if (props.open && props.mcpServers) {
      let value = JSON.stringify(props.mcpServers, null, 2) ?? "{}";
      if (value === "{}") {
        value = ""; // show placeholder
      }

      setJsonValue(value);
      setJsonError("");
      setIsSaving(false); // 다이얼로그 열 때 로딩 상태 초기화
    }
  });

  const saveJsonConfig = async () => {
    try {
      const parsed = JSON.parse(jsonValue());
      setIsSaving(true);
      setJsonError("");

      await props.onConfigChange(parsed);
      props.onOpenChange(false);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setJsonError("유효하지 않은 JSON 형식입니다.");
      } else {
        setJsonError("설정 저장 중 오류가 발생했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={props.open}
      onOpenChange={(open) => !isSaving() && props.onOpenChange(open)}
    >
      <SheetContent side="right" class="w-[600px] sm:w-[800px] flex flex-col">
        <Show
          when={isSaving()}
          fallback={
            <>
              <SheetHeader class="flex-shrink-0">
                <SheetTitle>JSON으로 서버 설정 편집</SheetTitle>
              </SheetHeader>

              <div class="flex-1 flex flex-col mt-6 min-h-0">
                <div class="flex-1 flex flex-col min-h-0">
                  <TextFieldRoot class="flex-1 flex flex-col">
                    <TextFieldLabel class="text-sm font-medium block mb-2 flex-shrink-0">
                      서버 설정 JSON
                    </TextFieldLabel>
                    <div class="flex-1 flex flex-col min-h-0">
                      <TextArea
                        value={jsonValue()}
                        onInput={(
                          e: InputEvent & {
                            currentTarget: HTMLTextAreaElement;
                          },
                        ) => setJsonValue(e.currentTarget.value)}
                        class="font-mono text-sm flex-1 resize-none min-h-0"
                        placeholder={JSON.stringify(sampleMCPConfig, null, 2)}
                      />
                    </div>
                  </TextFieldRoot>
                  {jsonError() && (
                    <p class="text-sm text-destructive mt-2 flex-shrink-0">
                      {jsonError()}
                    </p>
                  )}
                </div>

                <div class="flex justify-end gap-2 pt-4 flex-shrink-0 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => props.onOpenChange(false)}
                    disabled={isSaving()}
                  >
                    취소
                  </Button>
                  <Button onClick={saveJsonConfig} disabled={isSaving()}>
                    {isSaving() ? "저장 중..." : "적용"}
                  </Button>
                </div>
              </div>
            </>
          }
        >
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center space-y-4">
              <Loading text={"MCP 서버 설정을 저장하고 있습니다..."} />
            </div>
          </div>
        </Show>
      </SheetContent>
    </Sheet>
  );
};

export default McpServerJsonEditor;
