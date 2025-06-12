'use client';

import { useState, useCallback } from 'react';
import type { PendingToolCall } from '@/app/actions/agent/agent-state';

export function useToolInterrupt() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<PendingToolCall[]>([]);
  const [onApprovalCallback, setOnApprovalCallback] = useState<((approved: boolean) => void) | null>(null);

  const showToolInterruptDialog = useCallback((
    toolCalls: PendingToolCall[],
    onApproval: (approved: boolean) => void
  ) => {
    setPendingToolCalls(toolCalls);
    setOnApprovalCallback(() => onApproval);
    setIsDialogOpen(true);
  }, []);

  const handleApprove = useCallback(() => {
    onApprovalCallback?.(true);
    setIsDialogOpen(false);
    setPendingToolCalls([]);
    setOnApprovalCallback(null);
  }, [onApprovalCallback]);

  const handleReject = useCallback(() => {
    onApprovalCallback?.(false);
    setIsDialogOpen(false);
    setPendingToolCalls([]);
    setOnApprovalCallback(null);
  }, [onApprovalCallback]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setPendingToolCalls([]);
    setOnApprovalCallback(null);
  }, []);

  return {
    isDialogOpen,
    pendingToolCalls,
    showToolInterruptDialog,
    handleApprove,
    handleReject,
    closeDialog,
  };
}