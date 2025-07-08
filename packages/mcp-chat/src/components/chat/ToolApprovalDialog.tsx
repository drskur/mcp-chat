import type { Component } from "solid-js";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/textarea";
import { TextFieldRoot } from "@/components/ui/textfield";
import type { ToolCall } from "@/types/chat";

interface ToolApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolCall?: ToolCall;
  onApprove: (modifiedArgs?: Record<string, unknown>) => void;
  onReject: () => void;
  onAlwaysAllow?: () => void;
}

export const ToolApprovalDialog: Component<ToolApprovalDialogProps> = (
  props,
) => {
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [editedArgs, setEditedArgs] = createSignal("");
  const [parseError, setParseError] = createSignal("");

  // Initialize edited args when dialog opens or toolCall changes
  createEffect(() => {
    if (props.open && props.toolCall?.args) {
      setEditedArgs(JSON.stringify(props.toolCall.args, null, 2));
      setParseError("");
    }
  });

  const handleReject = async () => {
    setIsProcessing(true);
    props.onReject();
    props.onOpenChange(false);
    setIsProcessing(false);
  };

  const handleApproveOnce = async () => {
    setIsProcessing(true);
    let modifiedArgs: Record<string, unknown> | undefined;

    try {
      modifiedArgs = JSON.parse(editedArgs());
      setParseError("");
    } catch (_error) {
      setParseError("유효하지 않은 JSON 형식입니다.");
      setIsProcessing(false);
      return;
    }

    props.onApprove(modifiedArgs);
    props.onOpenChange(false);
    setIsProcessing(false);
  };

  const handleAlwaysAllow = async () => {
    setIsProcessing(true);
    let modifiedArgs: Record<string, unknown> | undefined;

    try {
      modifiedArgs = JSON.parse(editedArgs());
      setParseError("");
    } catch (_error) {
      setParseError("유효하지 않은 JSON 형식입니다.");
      setIsProcessing(false);
      return;
    }

    props.onAlwaysAllow?.();
    props.onApprove(modifiedArgs);
    props.onOpenChange(false);
    setIsProcessing(false);
  };

  const parsedToolName = createMemo(() => {
    const serverToolName = props.toolCall?.name ?? "서버__도구";
    const [server, tool] = serverToolName.split("__");
    return { serverName: server, toolName: tool };
  });

  const serverName = () => parsedToolName().serverName;
  const toolName = () => parsedToolName().toolName;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} modal={true}>
      <DialogContent
        class="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>외부 연동 서비스를 사용하고자 합니다</DialogTitle>
        </DialogHeader>

        <div class="space-y-4">
          {/* Tool information card */}
          <div class="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-background text-lg font-semibold">
                {serverName()?.charAt(0).toUpperCase() ?? "M"}
              </div>
              <div class="flex-1">
                <div class="space-y-0.5">
                  <div class="font-medium">{toolName()}</div>
                  <div class="text-sm text-muted-foreground">
                    {serverName()}
                  </div>
                </div>
              </div>
            </div>
            <Show when={props.toolCall?.args}>
              <div class="space-y-2">
                <div class="text-sm text-muted-foreground">요청:</div>
                <div class="space-y-2">
                  <TextFieldRoot>
                    <TextArea
                      value={editedArgs()}
                      onInput={(e) => setEditedArgs(e.currentTarget.value)}
                      class="font-mono text-sm min-h-[120px]"
                      placeholder="JSON 형식으로 입력하세요..."
                    />
                  </TextFieldRoot>
                  <Show when={parseError()}>
                    <div class="text-xs text-destructive">{parseError()}</div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          <DialogDescription class="text-sm">
            제3자 연동 서비스의 보안 또는 개인정보 보호 정책을 보장할 수
            없습니다.
          </DialogDescription>
        </div>

        <DialogFooter class="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing()}
            class="sm:mr-auto"
          >
            거절
          </Button>
          <Show when={props.onAlwaysAllow}>
            <Button
              variant="secondary"
              onClick={handleAlwaysAllow}
              disabled={isProcessing()}
            >
              항상 허용
            </Button>
          </Show>
          <Button onClick={handleApproveOnce} disabled={isProcessing()}>
            한 번만 허용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
