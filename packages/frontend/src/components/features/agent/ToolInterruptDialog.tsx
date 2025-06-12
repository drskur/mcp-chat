'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PendingToolCall } from '@/app/actions/agent/agent-state';

interface ToolInterruptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingToolCalls: PendingToolCall[];
  onApprove: () => void;
  onReject: () => void;
}

export function ToolInterruptDialog({
  open,
  onOpenChange,
  pendingToolCalls,
  onApprove,
  onReject,
}: ToolInterruptDialogProps) {
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  const toggleExpanded = (callId: string) => {
    setExpandedCall(expandedCall === callId ? null : callId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-300">!</span>
            </div>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-medium">
              외부 연동 서비스를 사용하고자 합니다
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            외부 서비스 연동 권한 요청 다이얼로그입니다. 승인하기 전에 각 작업을 주의 깊게 검토하십시오.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pendingToolCalls.map((toolCall) => (
            <div key={toolCall.id} className="border border-gray-700 rounded-lg">
              <button
                onClick={() => toggleExpanded(toolCall.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                    <span className="text-sm font-medium text-white">Y</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-100">{toolCall.name}</div>
                    <div className="text-sm text-gray-400">youtube</div>
                  </div>
                </div>
                {expandedCall === toolCall.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedCall === toolCall.id && (
                <div className="px-4 pb-4">
                  <div className="bg-gray-800 rounded-md p-4">
                    <div className="text-sm text-gray-300 mb-2">요청</div>
                    <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                      {JSON.stringify(toolCall.args, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-300 mb-2">
              승인하기 전에 각 작업을 주의 깊게 검토하십시오
            </p>
            <p className="text-sm text-gray-400">
              서드파티 연동 서비스의 보안 또는 개인정보 보호 정책을 보장할 수 없습니다.
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-4">
          <Button
            onClick={() => {
              onReject();
              onOpenChange(false);
            }}
            className="border-gray-600 bg-black text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            거절
          </Button>
          <Button
            onClick={() => {
              onApprove();
              onOpenChange(false);
            }}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white border-0 shadow-[0_4px_12px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.6)]"
          >
            허용
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}