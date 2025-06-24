import {type Component, createEffect, createSignal} from "solid-js";
import {Button} from "@/components/ui/button";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {TextArea} from "@/components/ui/textarea";
import {TextFieldLabel, TextFieldRoot} from "@/components/ui/textfield";

interface McpServerJsonEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mcpServers: unknown;
    onConfigChange: (config: Record<string, unknown>) => void;
}

const sampleMCPConfig = {
    "ddg-search": {
        "command": "uvx",
        "args": ["duckduckgo-mcp-server"],
        "transport": "stdio"
    }
}


const McpServerJsonEditor: Component<McpServerJsonEditorProps> = (props) => {
    const [jsonValue, setJsonValue] = createSignal("");
    const [jsonError, setJsonError] = createSignal("");

    // props.open이 true가 될 때 JSON 값을 초기화
    createEffect(() => {
        if (props.open && props.mcpServers) {
            let value = JSON.stringify(props.mcpServers, null, 2) ?? "{}";
            if (value === "{}") {
                value = ""; // show placeholder
            }

            setJsonValue(value);
            setJsonError("");
        }
    });

    const saveJsonConfig = () => {
        try {
            const parsed = JSON.parse(jsonValue());
            props.onConfigChange(parsed);
            props.onOpenChange(false);
        } catch (_e) {
            setJsonError("유효하지 않은 JSON 형식입니다.");
        }
    };

    return (
        <Sheet open={props.open} onOpenChange={props.onOpenChange}>
            <SheetContent side="right" class="w-[600px] sm:w-[800px] flex flex-col">
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
                                    onInput={(e: InputEvent & { currentTarget: HTMLTextAreaElement }) =>
                                        setJsonValue(e.currentTarget.value)
                                    }
                                    class="font-mono text-sm flex-1 resize-none min-h-0"
                                    placeholder={JSON.stringify(sampleMCPConfig, null, 2)}
                                />
                            </div>
                        </TextFieldRoot>
                        {jsonError() && (
                            <p class="text-sm text-destructive mt-2 flex-shrink-0">{jsonError()}</p>
                        )}
                    </div>

                    <div class="flex justify-end gap-2 pt-4 flex-shrink-0 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => props.onOpenChange(false)}
                        >
                            취소
                        </Button>
                        <Button onClick={saveJsonConfig}>
                            적용
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default McpServerJsonEditor;