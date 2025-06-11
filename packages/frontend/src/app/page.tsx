'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FloatingSidebarTrigger } from '@/components/sidebar/FloatingSidebarTrigger';
import { MainSidebar } from '@/components/sidebar/MainSidebar';
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen';
import { ChatSection } from '@/components/chat/ChatSection';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { StatusBar } from '@/components/layout/StatusBar';
import { AlertDialogManager } from '@/components/dialog/AlertDialogManager';
import { useUserSettings, useModelManager, useChatState } from '@/hooks';
import { DEFAULT_AGENT_NAME } from '@/types/settings.types';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeSettings, setActiveSettings] = useState<
    'tools' | 'prompt' | 'model' | 'user' | null
  >(null);
  const [agentName, _setAgentName] = useState(DEFAULT_AGENT_NAME);

  // 커스텀 훅들 사용
  const { userSettings, userInfo, updateUserSettings } = useUserSettings();
  const {
    selectedModel,
    tempSelectedModel,
    needReinit,
    handleModelChange,
    handleApplySettings,
    resetTempModel,
    initializeTempModel,
    setNeedReinit,
  } = useModelManager(agentName);
  const {
    currentSession,
    showChat,
    setShowChat,
    inputValue,
    savedInitialMessage,
    savedAttachments,
    alertDialogOpen,
    setAlertDialogOpen,
    attachments,
    fileInputRef,
    handleInputChange,
    handleFormSubmit,
    handleFileUpload,
    removeAttachment,
    handleAttachButtonClick,
    showNewChatConfirm,
    handleAlertConfirm,
  } = useChatState({ agentName });

  // URL에서 설정 상태 초기화
  useEffect(() => {
    const settingsParam = searchParams.get('settings');
    if (settingsParam && ['tools', 'prompt', 'model', 'user'].includes(settingsParam)) {
      setActiveSettings(settingsParam as 'tools' | 'prompt' | 'model' | 'user');
    }
  }, [searchParams]);

  // 다이얼로그 열릴 때 임시 모델 초기화
  useEffect(() => {
    if (activeSettings === 'model') {
      initializeTempModel(selectedModel);
    }
  }, [activeSettings, selectedModel, initializeTempModel]);

  const handleSettingsChanged = () => {
    setNeedReinit(true);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] text-gray-100 overflow-hidden">
      <SidebarProvider>
        <MainSidebar
          userSettings={userSettings}
          userName={userInfo.name}
          userEmail={userInfo.email}
          onNewChat={() => showNewChatConfirm()}
          onSettingsClick={(type) => setActiveSettings(type)}
        />

        {/* 접힌 상태에서만 보이는 플로팅 트리거 버튼 */}
        <FloatingSidebarTrigger />

        <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-gray-900 to-black">
          <div className="flex-1 p-6 overflow-auto hero-gradient overflow-x-hidden">
            {!showChat ? (
              <WelcomeScreen
                userSettings={userSettings}
                attachments={attachments}
                inputValue={inputValue}
                onInputChange={handleInputChange}
                onInputSubmit={handleFormSubmit}
                onAttachButtonClick={handleAttachButtonClick}
                onRemoveAttachment={removeAttachment}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
              />
            ) : (
              <ChatSection
                selectedModel={selectedModel}
                chatSessionId={currentSession.id}
                savedInitialMessage={savedInitialMessage}
                savedAttachments={savedAttachments}
                onClose={() => setShowChat(false)}
                onModelSelect={() => setActiveSettings('model')}
              />
            )}
          </div>

          <StatusBar />
        </div>
      </SidebarProvider>

      <SettingsDialog
        activeSettings={activeSettings}
        onOpenChange={(open) => {
          if (!open) {
            setActiveSettings(null);
            resetTempModel();
            // URL에서 설정 파라미터 제거
            router.push('/');
          }
        }}
        needReinit={needReinit}
        selectedModel={selectedModel}
        tempSelectedModel={tempSelectedModel}
        onModelChange={handleModelChange}
        onSettingsChanged={handleSettingsChanged}
        onApplySettings={handleApplySettings}
        onUserSettingsChanged={updateUserSettings}
        agentName={agentName}
      />

      <AlertDialogManager
        isOpen={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        onConfirm={handleAlertConfirm}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-[#0a0a0a] items-center justify-center text-gray-100">로딩 중...</div>}>
      <HomeContent />
    </Suspense>
  );
}