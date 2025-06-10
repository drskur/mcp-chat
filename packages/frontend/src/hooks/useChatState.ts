import { useState } from 'react';
import { FileAttachment } from '@/types/file-attachment';
import { useFileAttachment } from '@/hooks/useFileAttachment';
import { getUserModel } from '@/app/actions/models/user-model';

export function useChatState(agentName: string) {
  const [showChat, setShowChat] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatSessionId, setChatSessionId] = useState(Date.now().toString());

  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<
    string | undefined
  >(undefined);
  const [pendingAttachments, setPendingAttachments] = useState<
    FileAttachment[]
  >([]);

  const [savedInitialMessage, setSavedInitialMessage] = useState<string>('');
  const [savedAttachments, setSavedAttachments] = useState<FileAttachment[]>(
    []
  );

  const {
    attachments,
    fileInputRef,
    handleFileUpload,
    removeAttachment,
    clearAttachments,
    handleAttachButtonClick,
    prepareFilesForChat,
  } = useFileAttachment();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;

    const message = inputValue;
    setInputValue('');

    showNewChatConfirm(message, [...attachments]);
    clearAttachments();
  };

  const showNewChatConfirm = (
    initialMessage?: string,
    files: FileAttachment[] = []
  ) => {
    if (showChat) {
      setPendingInitialMessage(initialMessage);
      setPendingAttachments([...files]);
      setAlertDialogOpen(true);
    } else {
      initializeNewChat(initialMessage, files);
    }
  };

  const initializeNewChat = async (
    initialMessage?: string,
    files: FileAttachment[] = []
  ) => {
    localStorage.removeItem('mcp_initial_message');
    localStorage.removeItem('mcp_initial_attachments');
    localStorage.setItem('mcp_reset_conversation', 'true');

    window.dispatchEvent(new Event('mcp_reset_conversation'));
    setChatSessionId(Date.now().toString());

    if (!initialMessage && files.length === 0) {
      setSavedInitialMessage('');
      setSavedAttachments([]);
    }

    const { modelId } = await getUserModel(agentName);
    const initialChatAttachments = await prepareFilesForChat(files);

    setTimeout(() => {
      setShowChat(true);

      if (initialMessage || files.length > 0) {
        console.log('채팅 인터페이스로 전달: ', {
          message: initialMessage || '',
          attachments: initialChatAttachments.length,
          hasImageUrls: initialChatAttachments.some((a) => a.previewUrl),
        });

        setSavedInitialMessage(initialMessage || '');
        setSavedAttachments(initialChatAttachments);
      } else {
        setSavedInitialMessage('');
        setSavedAttachments([]);
        console.log('완전히 새로운 대화 시작 (초기 메시지/첨부 파일 없음)');
      }
    }, 100);
  };

  const handleAlertConfirm = () => {
    const hasInitialData =
      !!pendingInitialMessage || pendingAttachments.length > 0;

    initializeNewChat(
      hasInitialData ? pendingInitialMessage : undefined,
      hasInitialData ? pendingAttachments : []
    );

    setPendingInitialMessage(undefined);
    setPendingAttachments([]);
  };

  return {
    showChat,
    setShowChat,
    inputValue,
    chatSessionId,
    savedInitialMessage,
    savedAttachments,
    alertDialogOpen,
    setAlertDialogOpen,
    attachments,
    fileInputRef,
    handleInputChange,
    handleInputSubmit,
    handleFileUpload,
    removeAttachment,
    handleAttachButtonClick,
    showNewChatConfirm,
    handleAlertConfirm,
  };
}