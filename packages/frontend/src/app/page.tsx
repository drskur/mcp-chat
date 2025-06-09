'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FloatingSidebarTrigger } from '@/components/sidebar/FloatingSidebarTrigger';
import { MainSidebar } from '@/components/sidebar/MainSidebar';
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen';
import { ChatSection } from '@/components/chat/ChatSection';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useFileAttachment } from '@/hooks/useFileAttachment';
import { FileAttachment } from '@/types/file-attachment';
import { getUserModel } from '@/app/actions/models/user-model';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeSettings, setActiveSettings] = useState<
    'tools' | 'prompt' | 'model' | 'user' | 'help' | null
  >(null);
  const [selectedModel, setSelectedModel] = useState(
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  );
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [needReinit, setNeedReinit] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // 채팅 세션 관련 상태 추가
  const [chatSessionId, setChatSessionId] = useState(Date.now().toString());

  // 경고 대화상자 관련 상태 추가
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<
    string | undefined
  >(undefined);
  const [pendingAttachments, setPendingAttachments] = useState<
    FileAttachment[]
  >([]);

  // 파일 첨부 관련 상태 - useFileAttachment 훅 사용
  const {
    attachments,
    fileInputRef,
    handleFileUpload,
    removeAttachment,
    clearAttachments,
    handleAttachButtonClick,
  } = useFileAttachment();


  // 사용자 설정 관련 상태 추가
  const [userSettings, setUserSettings] = useState({
    title: 'PACE MCP AGENT',
    subtitle: 'Enterprise',
    logoUrl: '',
    logoOpacity: 1.0, // 기본 투명도 추가
  });

  // 사용자 정보 추가
  const [userName, setUserName] = useState('사용자');
  const [userEmail, setUserEmail] = useState('user@example.com');

  // URL에서 설정 상태 초기화
  useEffect(() => {
    const settingsParam = searchParams.get('settings');
    if (settingsParam && ['tools', 'prompt', 'model', 'user', 'help'].includes(settingsParam)) {
      setActiveSettings(settingsParam as 'tools' | 'prompt' | 'model' | 'user' | 'help');
    }
  }, [searchParams]);

  // 컴포넌트 마운트 시 사용자 설정 정보 로드
  useEffect(() => {
    // 사용자 설정 로드
    const loadUserSettings = () => {
      try {
        const savedSettings = localStorage.getItem('user_settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setUserSettings({
            title: parsedSettings.title || 'PACE MCP AGENT',
            subtitle: parsedSettings.subtitle || 'Enterprise',
            logoUrl: parsedSettings.logoUrl || '',
            logoOpacity:
              parsedSettings.logoOpacity !== undefined
                ? parsedSettings.logoOpacity
                : 1.0,
          });
          console.log('사용자 설정 정보를 불러왔습니다', parsedSettings);
        }
      } catch (error) {
        console.error('사용자 설정 정보를 불러오는데 실패했습니다:', error);
      }
    };

    // 사용자 정보 로드 (실제로는 API 호출 또는 쿠키에서 가져올 수 있음)
    const loadUserInfo = () => {
      try {
        // 여기서는 임시 데이터를 사용합니다
        setUserName('USER');
        setUserEmail('user@example.com');
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };

    // 기존 모델 정보 로드 코드
    const fetchUserModel = async () => {
      const { modelId } = await getUserModel();
      setSelectedModel(modelId);
    };

    // 함수 실행
    loadUserSettings();
    loadUserInfo();
    fetchUserModel();

    // 설정 변경 이벤트 리스너 추가
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_settings' && e.newValue) {
        try {
          const parsedSettings = JSON.parse(e.newValue);
          setUserSettings({
            title: parsedSettings.title || 'PACE MCP AGENT',
            subtitle: parsedSettings.subtitle || 'Enterprise',
            logoUrl: parsedSettings.logoUrl || '',
            logoOpacity:
              parsedSettings.logoOpacity !== undefined
                ? parsedSettings.logoOpacity
                : 1.0,
          });
        } catch (error) {
          console.error('설정 변경 감지 오류:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleSettingsChanged = () => {
    setNeedReinit(true);
  };

  const handleApplySettings = async () => {
    // 임시 저장된 모델이 있으면 적용
    if (tempSelectedModel && tempSelectedModel !== selectedModel) {
      setSelectedModel(tempSelectedModel);
      setTempSelectedModel('');

      // 에이전트 재초기화 API 호출
      try {
        const response = await fetch('/api/chat/reinit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model_id: tempSelectedModel }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log(
              '에이전트 재초기화 성공:',
              data.model_id,
              `(Max Tokens: ${data.max_tokens})`,
            );
          } else {
            console.error('에이전트 재초기화 실패:', data.message);
          }
        } else {
          console.error('에이전트 재초기화 요청 실패');
        }
      } catch (error) {
        console.error('에이전트 재초기화 요청 오류:', error);
      }
    }

    setNeedReinit(false);
    setActiveSettings(null); // 다이얼로그 닫기
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 입력 폼 제출 핸들러
  const handleInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;

    // 입력값 저장하고 초기화
    const message = inputValue;
    setInputValue('');

    // 새 대화 시작 대화상자 표시
    showNewChatConfirm(message, [...attachments]);

    // 첨부 파일 초기화
    clearAttachments();
  };

  // 새 대화 시작 확인 대화상자를 표시하는 함수
  const showNewChatConfirm = (
    initialMessage?: string,
    files: FileAttachment[] = [],
  ) => {
    // 대화 중인 경우에만 확인 대화상자 표시
    if (showChat) {
      // 대화 내용이 있는 경우 초기화 확인 대화상자 표시
      setPendingInitialMessage(initialMessage);
      setPendingAttachments([...files]);
      setAlertDialogOpen(true);
    } else {
      // 대화가 없는 경우 바로 새 대화 시작
      initializeNewChat(initialMessage, files);
    }
  };

  // 새 대화 초기화 실행 함수
  const initializeNewChat = async (
    initialMessage?: string,
    files: FileAttachment[] = [],
  ) => {
    // 새 대화 시작 전에 이전 대화 초기화 (localStorage 포함)
    localStorage.removeItem('mcp_initial_message');
    localStorage.removeItem('mcp_initial_attachments');

    // 대화 내용 초기화를 위한 플래그 설정
    localStorage.setItem('mcp_reset_conversation', 'true');

    // 대화 초기화 이벤트 발생 (같은 창에서도 동작하도록)
    window.dispatchEvent(new Event('mcp_reset_conversation'));

    // 채팅 세션 ID 업데이트 (컴포넌트 강제 재마운트를 위해)
    setChatSessionId(Date.now().toString());

    // 초기화 후 파라미터로 전달된 메시지와 첨부 파일만 사용
    // 이전 저장된 데이터는 초기화
    if (!initialMessage && files.length === 0) {
      setSavedInitialMessage('');
      setSavedAttachments([]);
    }

    // 새 대화 시작 시 최신 모델 정보 불러오기
    let currentModelId = selectedModel;
    const { modelId } = await getUserModel();
    if (modelId !== selectedModel) {
      console.log('저장된 모델 정보로 업데이트:', modelId);
      setSelectedModel(modelId);
      currentModelId = modelId;
    }

    // 에이전트 초기화 API 호출
    try {
      console.log('에이전트 초기화 요청 시작...');
      const reinitResponse = await fetch('/api/chat/reinit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_id: currentModelId }),
      });

      if (reinitResponse.ok) {
        const reinitData = await reinitResponse.json();
        if (reinitData.success) {
          console.log(
            '에이전트 초기화 성공:',
            reinitData.model_id,
            `(Max Tokens: ${reinitData.max_tokens})`,
          );
        } else {
          console.error('에이전트 초기화 실패:', reinitData.message);
        }
      } else {
        console.error('에이전트 초기화 요청 실패:', reinitResponse.status);
      }
    } catch (error) {
      console.error('에이전트 초기화 오류:', error);
    }

    // 첨부 파일 처리
    const initialChatAttachments: FileAttachment[] = [];

    // 파일 데이터 처리를 위한 Promise 배열
    const fileProcessPromises: Promise<void>[] = [];

    if (files.length > 0) {
      console.log('첨부 파일로 대화 시작:', files.length, '개 파일');

      // 각 파일 처리
      for (const attachment of files) {
        // 이미지 파일 처리
        if (attachment.type.startsWith('image/')) {
          // previewUrl이 없거나 blob URL인 경우 data URL로 변환
          if (
            !attachment.previewUrl ||
            attachment.previewUrl.startsWith('blob:')
          ) {
            const promise = new Promise<void>((resolve) => {
              // previewUrl이 blob URL인 경우 URL을 통해 파일 객체 다시 가져오기
              if (
                attachment.previewUrl &&
                attachment.previewUrl.startsWith('blob:')
              ) {
                console.log(
                  'blob URL을 data URL로 변환 중:',
                  attachment.file.name,
                );
              }

              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file,
                  type: attachment.type,
                  previewUrl: result, // data URL로 저장
                });
                resolve();
              };
              reader.onerror = () => {
                console.error('파일 읽기 오류:', attachment.file.name);
                // 오류가 있어도 기본 정보는 추가
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file,
                  type: attachment.type,
                });
                resolve();
              };
              reader.readAsDataURL(attachment.file);
            });
            fileProcessPromises.push(promise);
          } else if (attachment.previewUrl.startsWith('data:')) {
            // 이미 data URL인 경우 그대로 사용
            initialChatAttachments.push({
              id: attachment.id,
              file: attachment.file,
              type: attachment.type,
              previewUrl: attachment.previewUrl,
            });
          } else {
            // 알 수 없는 형식의 URL - 무시하고 새로 생성
            const promise = new Promise<void>((resolve) => {
              console.log(
                '알 수 없는 형식의 URL, data URL로 변환 중:',
                attachment.file.name,
              );
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file,
                  type: attachment.type,
                  previewUrl: result,
                });
                resolve();
              };
              reader.onerror = () => {
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file,
                  type: attachment.type,
                });
                resolve();
              };
              reader.readAsDataURL(attachment.file);
            });
            fileProcessPromises.push(promise);
          }
        } else {
          // 이미지가 아닌 파일은 그대로 추가
          initialChatAttachments.push({
            id: attachment.id,
            file: attachment.file,
            type: attachment.type,
            previewUrl: attachment.previewUrl,
          });
        }
      }
    }

    // 모든 파일 처리 완료 후 채팅 시작
    await Promise.all(fileProcessPromises);

    // 약간의 지연 후에 다시 채팅 인터페이스 마운트 (리셋 효과)
    setTimeout(() => {
      // 대화 시작 - 상태 변경으로 화면 전환
      setShowChat(true);

      // 새로운 초기 메시지와 첨부파일만 사용
      if (initialMessage || files.length > 0) {
        // ChatInterface에 초기 메시지와 첨부파일 전달
        console.log('채팅 인터페이스로 전달: ', {
          message: initialMessage || '',
          attachments: initialChatAttachments.length,
          hasImageUrls: initialChatAttachments.some((a) => a.previewUrl),
        });

        setSavedInitialMessage(initialMessage || '');
        setSavedAttachments(initialChatAttachments);
      } else {
        // 아무 것도 전달하지 않고 완전히 새로운 대화 시작
        setSavedInitialMessage('');
        setSavedAttachments([]);
        console.log('완전히 새로운 대화 시작 (초기 메시지/첨부 파일 없음)');
      }
    }, 100);
  };

  // 다이얼로그 열릴 때 임시 모델 초기화
  useEffect(() => {
    if (activeSettings === 'model') {
      setTempSelectedModel(selectedModel);
    }
  }, [activeSettings, selectedModel]);

  // 새로운 상태 추가
  const [savedInitialMessage, setSavedInitialMessage] = useState<string>('');
  const [savedAttachments, setSavedAttachments] = useState<FileAttachment[]>(
    [],
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] text-gray-100 overflow-hidden">
      <SidebarProvider>
        <MainSidebar
          userSettings={userSettings}
          userName={userName}
          userEmail={userEmail}
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
                onInputSubmit={handleInputSubmit}
                onAttachButtonClick={handleAttachButtonClick}
                onRemoveAttachment={removeAttachment}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
              />
            ) : (
              <ChatSection
                selectedModel={selectedModel}
                chatSessionId={chatSessionId}
                savedInitialMessage={savedInitialMessage}
                savedAttachments={savedAttachments}
                onClose={() => setShowChat(false)}
                onModelSelect={() => setActiveSettings('model')}
              />
            )}
          </div>

          {/* 상태 표시줄 - AWS 정보로 수정 */}
          <div className="bg-gray-900/80 border-t border-gray-900 p-2 px-4 text-xs text-gray-500 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-1 md:mb-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <path d="M14 5c.5 1.5 1.5 2 2.5 2h1a3 3 0 0 1 0 6h-.5A5.5 5.5 0 0 1 14 7.5V5Z" />
                <path d="M6 8h2a2 2 0 0 0 0-4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2a4 4 0 0 1-4 4v4h-2.5" />
                <path d="M4 14a4 4 0 0 1 4-4" />
              </svg>
              <span className="font-medium">POWERED BY AWS</span>
            </div>
            <div className="mb-1 md:mb-0">
              <span>Designed and built by the AWS KOREA PACE Team</span>
            </div>
            <div>
              <span>
                &copy; 2025 Amazon Web Services, Inc. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </SidebarProvider>

      <SettingsDialog
        activeSettings={activeSettings}
        onOpenChange={(open) => {
          if (!open) {
            setActiveSettings(null);
            setTempSelectedModel('');
            // URL에서 설정 파라미터 제거
            router.push('/');
          }
        }}
        needReinit={needReinit}
        selectedModel={selectedModel}
        tempSelectedModel={tempSelectedModel}
        onModelChange={(modelId) => {
          setTempSelectedModel(modelId);
          setNeedReinit(true);
        }}
        onSettingsChanged={handleSettingsChanged}
        onApplySettings={handleApplySettings}
        onUserSettingsChanged={() => {
          try {
            const savedSettings = localStorage.getItem('user_settings');
            if (savedSettings) {
              setUserSettings(JSON.parse(savedSettings));
            }
          } catch (error) {
            console.error('설정 적용 실패:', error);
          }
        }}
      />

      {/* 경고 대화상자 - 새 대화 시작 확인 */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>대화 내용 초기화</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              새 대화를 시작하면 현재 대화 내용이 모두 초기화되고, 에이전트가
              재시작됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
              onClick={() => {
                // 현재 대화가 있는 상태에서 새 대화 시작
                // 저장된 임시 메시지와 첨부 파일(있는 경우만)로 새 대화 초기화
                const hasInitialData =
                  !!pendingInitialMessage || pendingAttachments.length > 0;

                // 새 대화 초기화 함수 호출
                initializeNewChat(
                  hasInitialData ? pendingInitialMessage : undefined,
                  hasInitialData ? pendingAttachments : [],
                );

                // 임시 데이터 초기화
                setPendingInitialMessage(undefined);
                setPendingAttachments([]);
              }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
