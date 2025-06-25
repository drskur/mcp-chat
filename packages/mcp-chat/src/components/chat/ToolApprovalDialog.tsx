import type {Component} from "solid-js";
import {createSignal, Show} from "solid-js";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import type {ToolCall} from "@/types/chat";

interface ToolApprovalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    toolCall?: ToolCall;
    onApprove: () => void;
    onReject: () => void;
    onAlwaysAllow?: () => void;
}

export const ToolApprovalDialog: Component<ToolApprovalDialogProps> = (props) => {
    const [isProcessing, setIsProcessing] = createSignal(false);

    const handleReject = async () => {
        setIsProcessing(true);
        props.onReject();
        props.onOpenChange(false);
        setIsProcessing(false);
    };

    const handleApproveOnce = async () => {
        setIsProcessing(true);
        props.onApprove();
        props.onOpenChange(false);
        setIsProcessing(false);
    };

    const handleAlwaysAllow = async () => {
        setIsProcessing(true);
        props.onAlwaysAllow?.();
        props.onApprove();
        props.onOpenChange(false);
        setIsProcessing(false);
    };

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent class="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>외부 연동 서비스를 사용하고자 합니다</DialogTitle>
                </DialogHeader>

                <div class="space-y-4">
                    {/* Tool information card */}
                    <div class="rounded-lg border border-border bg-muted/50 p-4">
                        <div class="flex items-start gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-background text-lg font-semibold">
                                {props.toolCall?.name?.charAt(0).toUpperCase() ?? "T"}
                            </div>
                            <div class="flex-1 space-y-2">
                                <div class="font-medium">{props.toolCall?.name ?? "도구"}</div>
                                <Show when={props.toolCall?.args}>
                                    <div class="space-y-1">
                                        <div class="text-sm text-muted-foreground">요청:</div>
                                        <div class="rounded bg-background p-2 text-sm font-mono">
                                            <pre class="whitespace-pre-wrap break-all">
                                                {JSON.stringify(props.toolCall?.args, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </div>

                    <DialogDescription class="text-sm">
                        제3자 연동 서비스의 보안 또는 개인정보 보호 정책을 보장할 수 없습니다.
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
                    <Button
                        onClick={handleApproveOnce}
                        disabled={isProcessing()}
                    >
                        한 번만 허용
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};