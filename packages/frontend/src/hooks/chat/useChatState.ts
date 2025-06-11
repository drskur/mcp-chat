import { useState } from 'react';
import { FileAttachment } from '@/types/file-attachment';
import { useChatSession } from './useChatSession';
import { useChatInput } from './useChatInput';
import { useFileManager } from '@/hooks/core/useFileManager';

interface UseChatStateOptions {
  agentName: string;
  autoStart?: boolean;
}

export function useChatState(options: UseChatStateOptions) {
  const { autoStart = false } = options;

  // Dialog state for new chat confirmation
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<
    string | undefined
  >(undefined);
  const [pendingAttachments, setPendingAttachments] = useState<
    FileAttachment[]
  >([]);

  // Saved initial data for chat
  const [savedInitialMessage, setSavedInitialMessage] = useState<string>('');
  const [savedAttachments, setSavedAttachments] = useState<FileAttachment[]>(
    [],
  );

  // Session management
  const {
    currentSession,
    showChat,
    setShowChat,
    createNewSession,
    activateSession,
    resetSession,
  } = useChatSession();

  // File management
  const {
    attachments,
    fileInputRef,
    handleFileUpload,
    removeAttachment,
    clearAttachments,
    handleAttachButtonClick,
    prepareFilesForChat,
  } = useFileManager();

  // Input handling
  const { inputValue, handleInputChange, handleFormSubmit, clearInput } =
    useChatInput({
      onSubmit: (message, attachments) => {
        showNewChatConfirm(message, attachments);
        clearAttachments();
      },
    });

  const showNewChatConfirm = (
    initialMessage?: string,
    files: FileAttachment[] = [],
  ) => {
    if (showChat && currentSession.isActive) {
      setPendingInitialMessage(initialMessage);
      setPendingAttachments([...files]);
      setAlertDialogOpen(true);
    } else {
      initializeNewChat(initialMessage, files);
    }
  };

  const initializeNewChat = async (
    initialMessage?: string,
    files: FileAttachment[] = [],
  ) => {
    // Reset session
    const newSession = resetSession();

    // Clear input
    clearInput();

    // If no initial data, clear saved data
    if (!initialMessage && files.length === 0) {
      setSavedInitialMessage('');
      setSavedAttachments([]);
      return;
    }

    // Prepare files for chat
    const initialChatAttachments = await prepareFilesForChat(files);

    // Small delay to ensure chat interface is ready
    setTimeout(() => {
      if (initialMessage || files.length > 0) {
        console.log('Initializing chat with data:', {
          sessionId: newSession.id,
          message: initialMessage || '',
          attachments: initialChatAttachments.length,
          hasImageUrls: initialChatAttachments.some((a) => a.previewUrl),
        });

        setSavedInitialMessage(initialMessage || '');
        setSavedAttachments(initialChatAttachments);
      } else {
        setSavedInitialMessage('');
        setSavedAttachments([]);
        console.log('Starting completely new conversation');
      }
    }, 100);
  };

  const handleAlertConfirm = () => {
    const hasInitialData =
      !!pendingInitialMessage || pendingAttachments.length > 0;

    initializeNewChat(
      hasInitialData ? pendingInitialMessage : undefined,
      hasInitialData ? pendingAttachments : [],
    );

    setPendingInitialMessage(undefined);
    setPendingAttachments([]);
    setAlertDialogOpen(false);
  };

  const handleAlertCancel = () => {
    setPendingInitialMessage(undefined);
    setPendingAttachments([]);
    setAlertDialogOpen(false);
  };

  // Auto-start chat if requested
  if (autoStart && !showChat && !currentSession.isActive) {
    activateSession();
  }

  return {
    // Session state
    currentSession,
    showChat,
    setShowChat,

    // Input state
    inputValue,

    // Saved initial data
    savedInitialMessage,
    savedAttachments,

    // Dialog state
    alertDialogOpen,
    setAlertDialogOpen,

    // File attachments
    attachments,
    fileInputRef,

    // Handlers
    handleInputChange,
    handleFormSubmit: (e: React.FormEvent<HTMLFormElement>) =>
      handleFormSubmit(e, attachments),
    handleFileUpload,
    removeAttachment,
    handleAttachButtonClick,

    // Actions
    showNewChatConfirm,
    initializeNewChat,
    handleAlertConfirm,
    handleAlertCancel,
    createNewSession,
    activateSession,
    resetSession,
  };
}
