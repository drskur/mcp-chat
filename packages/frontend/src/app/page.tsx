'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  MessageCircle, 
  PlusIcon, 
  MessageSquare, 
  Book, 
  BarChart3, 
  Menu,
  Brain,
  Server,
  Sparkles,
  Paperclip,
  X,
  FileIcon
} from 'lucide-react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarTrigger, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarFooter,
  SidebarSeparator,
  useSidebar
} from '@/components/ui/sidebar';
import { 
  ExpandableChat, 
  ExpandableChatHeader, 
  ExpandableChatBody
} from '@/components/ui/expandable-chat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { ChatInterface } from '@/components/chat/ChatInterface';
import MCPToolManager from '@/components/dialog/MCPToolManager';
import SystemPromptEditor from '@/components/dialog/SystemPromptEditor';
import ModelSelector from '@/components/dialog/ModelSelector';
import UserSettings from '@/components/dialog/UserSettings';
import { Button } from '@/components/ui/button';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import HelpPanel from '@/components/dialog/HelpPanel';

// 사이드바 트리거 버튼 컴포넌트
const FloatingSidebarTrigger = () => {
  const { open, toggleSidebar } = useSidebar();
  
  if (open) {
    return null;
  }
  
  return (
    <div className="fixed top-4 left-4 z-50 md:flex hidden group/trigger">
      <Button 
        size="icon" 
        variant="outline" 
        className="rounded-full w-10 h-10 bg-indigo-600 border-none hover:bg-indigo-700 text-white shadow-lg"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="absolute left-12 top-2.5 opacity-0 group-hover/trigger:opacity-100 transition-opacity bg-indigo-600 px-3 py-1.5 rounded text-xs text-white whitespace-nowrap shadow-lg">
        메뉴 열기 (⌘+B)
      </div>
    </div>
  );
};

// 파일 첨부 아이템 타입
interface FileAttachment {
  id: string;
  file: File;
  type: string;
  previewUrl?: string;
}

export default function Home() {
  const [activeSettings, setActiveSettings] = useState<'tools' | 'prompt' | 'model' | 'user' | 'help' | null>(null);
  const [selectedModel, setSelectedModel] = useState('anthropic.claude-3-5-sonnet-20241022-v2:0');
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [needReinit, setNeedReinit] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [conversations] = useState([
    { id: 'conv1', title: '새 프로젝트 설정 도움말', lastMessage: '30분 전', starred: true, time: 'today' },
    { id: 'conv2', title: '백엔드 API 개발 문의', lastMessage: '1시간 전', starred: false, time: 'today' },
    { id: 'conv3', title: '채팅 인터페이스 디자인', lastMessage: '어제', starred: true, time: 'week' },
    { id: 'conv4', title: 'LangChain 활용 방법', lastMessage: '3일 전', starred: false, time: 'week' },
    { id: 'conv5', title: 'AWS 배포 설정', lastMessage: '1주 전', starred: false, time: 'month' },
    { id: 'conv6', title: '데이터베이스 스키마 설계', lastMessage: '2주 전', starred: false, time: 'month' },
  ]);
  const [showChat, setShowChat] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // 채팅 세션 관련 상태 추가
  const [chatSessionId, setChatSessionId] = useState(Date.now().toString());
  
  // 경고 대화상자 관련 상태 추가
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<string | undefined>(undefined);
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  
  // 파일 첨부 관련 상태 추가
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 플레이스홀더 목록
  const placeholders = [
    "What's the latest news about AWS?",
    "Can you search for news about AI developments?",
    "Generate an image of a cloud architecture diagram",
    "Create an illustration of a modern web application",
    "Can you make an image of a futuristic data center?",
    "Search for recent articles about cloud computing trends"
  ];

  // 사용자 설정 관련 상태 추가
  const [userSettings, setUserSettings] = useState({
    title: 'PACE MCP AGENT',
    subtitle: 'Enterprise',
    logoUrl: '',
    logoOpacity: 1.0 // 기본 투명도 추가
  });
  
  // 사용자 정보 추가
  const [userName, setUserName] = useState('사용자');
  const [userEmail, setUserEmail] = useState('user@example.com');

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
            logoOpacity: parsedSettings.logoOpacity !== undefined ? parsedSettings.logoOpacity : 1.0
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
      try {
        const response = await fetch('/api/models/user-model');
        
        if (response.ok) {
          const data = await response.json();
          if (data.model_id) {
            setSelectedModel(data.model_id);
            console.log('사용자 모델 정보를 불러왔습니다:', data.model_id);
          }
        } else {
          console.error('사용자 모델 정보를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('사용자 모델 정보 요청 오류:', error);
      }
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
            logoOpacity: parsedSettings.logoOpacity !== undefined ? parsedSettings.logoOpacity : 1.0
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
            console.log('에이전트 재초기화 성공:', data.model_id, `(Max Tokens: ${data.max_tokens})`);
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

  // 파일 첨부 핸들러 추가
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    // 파일 배열 복사
    const files = Array.from(e.target.files);
    
    // 각 파일에 대한 처리를 Promise 배열로 모음
    const filePromises = files.map(file => {
      return new Promise<FileAttachment>((resolve) => {
        const id = crypto.randomUUID();
        const attachment: FileAttachment = {
          id,
          file,
          type: file.type,
        };
        
        // 이미지 파일의 경우 data URL 생성 (Blob URL 대신)
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            attachment.previewUrl = result; // data URL
            resolve(attachment);
          };
          reader.onerror = () => {
            console.error('파일 읽기 오류:', file.name);
            resolve(attachment); // 오류 발생 시 previewUrl 없이 반환
          };
          reader.readAsDataURL(file);
        } else {
          // 이미지가 아닌 파일은 바로 해결
          resolve(attachment);
        }
      });
    });
    
    // 모든 파일 처리가 완료된 후 상태 업데이트
    Promise.all(filePromises).then(newAttachments => {
      setAttachments(prev => [...prev, ...newAttachments]);
    });
    
    // 입력 필드 초기화 (같은 파일 재선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // 첨부 파일 제거 핸들러
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const updated = prev.filter(file => file.id !== id);
      
      // 제거할 파일의 미리보기 URL 해제 (blob URL인 경우에만)
      const fileToRemove = prev.find(file => file.id === id);
      if (fileToRemove?.previewUrl && fileToRemove.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      
      return updated;
    });
  };
  
  // 파일 첨부 버튼 클릭 핸들러
  const handleAttachButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 입력 폼 제출 핸들러
  const handleInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!inputValue.trim() && attachments.length === 0)) return;
    
    // 입력값 저장하고 초기화
    const message = inputValue;
    setInputValue('');
    
    // 새 대화 시작 대화상자 표시
    showNewChatConfirm(message, [...attachments]);
    
    // 첨부 파일 초기화
    setAttachments([]);
  };

  // 새 대화 시작 확인 대화상자를 표시하는 함수
  const showNewChatConfirm = (initialMessage?: string, files: FileAttachment[] = []) => {
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
  const initializeNewChat = async (initialMessage?: string, files: FileAttachment[] = []) => {
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
      setSavedInitialMessage("");
      setSavedAttachments([]);
    }
    
    // 새 대화 시작 시 최신 모델 정보 불러오기
    let currentModelId = selectedModel;
    try {
      const response = await fetch('/api/models/user-model');
      
      if (response.ok) {
        const data = await response.json();
        if (data.model_id && data.model_id !== selectedModel) {
          console.log('저장된 모델 정보로 업데이트:', data.model_id);
          setSelectedModel(data.model_id);
          currentModelId = data.model_id;
        }
      }
    } catch (error) {
      console.error('모델 정보 로드 오류:', error);
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
          console.log('에이전트 초기화 성공:', reinitData.model_id, `(Max Tokens: ${reinitData.max_tokens})`);
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
          if (!attachment.previewUrl || attachment.previewUrl.startsWith('blob:')) {
            const promise = new Promise<void>((resolve) => {
              // previewUrl이 blob URL인 경우 URL을 통해 파일 객체 다시 가져오기
              if (attachment.previewUrl && attachment.previewUrl.startsWith('blob:')) {
                console.log('blob URL을 data URL로 변환 중:', attachment.file.name);
              }
              
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file,
                  type: attachment.type,
                  previewUrl: result // data URL로 저장
                });
                resolve();
              };
              reader.onerror = () => {
                console.error('파일 읽기 오류:', attachment.file.name);
                // 오류가 있어도 기본 정보는 추가
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file,
                  type: attachment.type
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
              previewUrl: attachment.previewUrl
            });
          } else {
            // 알 수 없는 형식의 URL - 무시하고 새로 생성
            const promise = new Promise<void>((resolve) => {
              console.log('알 수 없는 형식의 URL, data URL로 변환 중:', attachment.file.name);
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file,
                  type: attachment.type,
                  previewUrl: result
                });
                resolve();
              };
              reader.onerror = () => {
                initialChatAttachments.push({
                  id: attachment.id,
                  file: attachment.file, 
                  type: attachment.type
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
            previewUrl: attachment.previewUrl
          });
        }
      }
    }

    // 모든 파일 처리 완료 후 채팅 시작
    await Promise.all(fileProcessPromises);
    
    // 약간의 지연 후에 다시 채팅 인터페이스 마운트 (리셋 효과)
    setTimeout(() => {
      // 대화 시작 - 상태 변경으로 화면 전환
      setActiveConversation(null);
      setShowChat(true);
      
      // 새로운 초기 메시지와 첨부파일만 사용
      if (initialMessage || files.length > 0) {
        // ChatInterface에 초기 메시지와 첨부파일 전달
        console.log('채팅 인터페이스로 전달: ', {
          message: initialMessage || "",
          attachments: initialChatAttachments.length,
          hasImageUrls: initialChatAttachments.some(a => a.previewUrl)
        });
        
        setSavedInitialMessage(initialMessage || "");
        setSavedAttachments(initialChatAttachments);
      } else {
        // 아무 것도 전달하지 않고 완전히 새로운 대화 시작
        setSavedInitialMessage("");
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
  const [savedInitialMessage, setSavedInitialMessage] = useState<string>("");
  const [savedAttachments, setSavedAttachments] = useState<FileAttachment[]>([]);
  
  // getDialogConfig 함수를 수정하여 사용자 설정 추가
  const getDialogConfig = () => {
    switch (activeSettings) {
      case 'tools':
        return {
          title: 'MCP 도구 관리',
          description: 'AI 어시스턴트가 사용할 MCP 도구를 관리합니다.'
        };
      case 'prompt':
        return {
          title: '시스템 프롬프트 설정',
          description: 'AI 어시스턴트에게 지시할 시스템 프롬프트를 설정합니다.'
        };
      case 'model':
        return {
          title: 'AI 모델 선택',
          description: '사용할 AI 모델을 선택합니다.'
        };
      case 'user':
        return {
          title: '사용자 인터페이스 설정',
          description: '시스템 제목과 로고를 사용자 정의합니다.'
        };
      case 'help':
        return {
          title: '도움말',
          description: 'MCP 시스템 사용법 및 안내'
        };
      default:
        return {
          title: '설정',
          description: '설정을 변경합니다.'
        };
    }
  };

  const dialogConfig = getDialogConfig();

  return (
    <div className="flex h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] text-gray-100 overflow-hidden">
      <SidebarProvider>
        <Sidebar variant="inset" className="border-r border-gray-900 bg-[#0f0f10] overflow-y-auto overflow-x-hidden">
          <SidebarHeader className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg overflow-hidden" style={{ width: '50px', height: '38px' }}>
                {userSettings.logoUrl ? (
                  <img 
                    src={userSettings.logoUrl} 
                    alt="로고" 
                    className="w-full h-full object-cover rounded-lg"
                    style={{ opacity: userSettings.logoOpacity }}
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Brain className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">{userSettings.title}</h1>
                <p className="text-xs text-gray-400">{userSettings.subtitle}</p>
              </div>
              <SidebarTrigger />
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>

                <SidebarMenuItem>
                
                  <SidebarMenuButton 
                    className="w-full justify-start gap-2 py-2 mb-3 bg-indigo-600 hover:bg-indigo-700 rounded-md"
                    onClick={() => showNewChatConfirm()}
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span className="text-sm">새 대화</span>
                  </SidebarMenuButton>

                  <SidebarMenuButton 
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveSettings('model')}
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="flex-grow text-left">AI 모델</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveSettings('tools')}
                  >
                    <Settings className="h-5 w-5" />
                    <span>MCP 도구</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveSettings('prompt')}
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>시스템 프롬프트</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveSettings('help')}
                  >
                    <Book className="h-5 w-5" />
                    <span>도움말</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator className="my-3 bg-gray-800 w-[90%] mx-auto" />
           
          </SidebarContent>
          
          <SidebarFooter className="mt-auto p-4 border-t border-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-yellow-300 font-medium">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{userName}</p>
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
              <button 
                className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
                onClick={() => setActiveSettings('user')}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* 접힌 상태에서만 보이는 플로팅 트리거 버튼 */}
        <FloatingSidebarTrigger />

        <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-gray-900 to-black">
          <div className="flex-1 p-6 overflow-auto hero-gradient overflow-x-hidden">
            {!showChat ? (
              <div className="h-full flex flex-col items-center justify-center max-w-full">
                <div className="max-w-4xl w-full glass p-8 md:p-12 rounded-xl mb-8 fade-in overflow-hidden">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 bg-indigo-600 rounded-xl blur-lg opacity-50"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center">
                        {userSettings.logoUrl ? (
                          <img 
                            src={userSettings.logoUrl} 
                            alt="로고" 
                            className="w-full h-full object-contain"
                            style={{ opacity: userSettings.logoOpacity }}
                          />
                        ) : (
                          <Brain className="h-10 w-10 text-white" />
                        )}
                      </div>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400">
                      {userSettings.title}
                    </h1>
                    
                    <div className="flex gap-2 items-center justify-center mb-5">
                      <div className="flex items-center gap-1.5 bg-indigo-950/60 px-3 py-1.5 rounded-full text-xs text-indigo-300">
                        <Server className="h-3 w-3" />
                        <span>AWS Bedrock</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1.5 rounded-full text-xs text-purple-300">
                        <Brain className="h-3 w-3" />
                        <span>Anthropic Claude</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1.5 rounded-full text-xs text-purple-300">
                        <Brain className="h-3 w-3" />
                        <span>Amazon Nova</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1.5 rounded-full text-xs text-purple-300">
                        <Brain className="h-3 w-3" />
                        <span>Meta Llama</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-950/60 px-3 py-1.5 rounded-full text-xs text-blue-300">
                        <Sparkles className="h-3 w-3" />
                        <span>LangGraph</span>
                      </div>
                    </div>
                    
                    {/* 첨부 파일 미리보기 */}
                    {attachments.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2 justify-center">
                        {attachments.map(file => (
                          <div key={file.id} className="relative group bg-gray-800 rounded-md border border-gray-700 p-2 flex items-center gap-2">
                            {file.previewUrl ? (
                              <div className="w-10 h-10 rounded overflow-hidden bg-gray-700 flex items-center justify-center">
                                <img 
                                  src={file.previewUrl} 
                                  alt="미리보기" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                                {file.type.includes('pdf') && <FileIcon className="h-5 w-5 text-red-400" />}
                                {(file.type.includes('word') || file.type.includes('doc')) && <FileIcon className="h-5 w-5 text-blue-400" />}
                                {(file.type.includes('excel') || file.type.includes('sheet') || file.type.includes('xls') || file.type.includes('csv')) && 
                                  <FileIcon className="h-5 w-5 text-green-400" />}
                                {(file.type.includes('text') || file.type.includes('markdown') || file.type.includes('txt') || file.type.includes('md')) && 
                                  <FileIcon className="h-5 w-5 text-gray-400" />}
                                {(file.type.includes('image') || file.type.includes('png') || file.type.includes('jpg') || file.type.includes('jpeg') || file.type.includes('gif')) && 
                                  <FileIcon className="h-5 w-5 text-purple-400" />}
                                {(file.type.includes('html') || file.type.includes('htm')) && 
                                  <FileIcon className="h-5 w-5 text-orange-400" />}
                                {(file.type.includes('json') || file.type.includes('xml')) && 
                                  <FileIcon className="h-5 w-5 text-cyan-400" />}
                                {(file.type.includes('zip') || file.type.includes('rar') || file.type.includes('tar') || file.type.includes('gz')) && 
                                  <FileIcon className="h-5 w-5 text-yellow-400" />}
                                {(file.type.includes('ppt') || file.type.includes('presentation')) && 
                                  <FileIcon className="h-5 w-5 text-pink-400" />}
                                {!(file.type.includes('pdf') || file.type.includes('doc') || file.type.includes('word') || 
                                   file.type.includes('excel') || file.type.includes('sheet') || file.type.includes('xls') || file.type.includes('csv') || 
                                   file.type.includes('text') || file.type.includes('markdown') || file.type.includes('txt') || file.type.includes('md') ||
                                   file.type.includes('image') || file.type.includes('png') || file.type.includes('jpg') || file.type.includes('jpeg') || file.type.includes('gif') ||
                                   file.type.includes('html') || file.type.includes('htm') ||
                                   file.type.includes('json') || file.type.includes('xml') ||
                                   file.type.includes('zip') || file.type.includes('rar') || file.type.includes('tar') || file.type.includes('gz') ||
                                   file.type.includes('ppt') || file.type.includes('presentation')) && 
                                  <FileIcon className="h-5 w-5 text-gray-400" />}
                              </div>
                            )}
                            <div className="text-xs">
                              <p className="text-gray-300 max-w-[100px] truncate">{file.file.name}</p>
                              <p className="text-gray-500">{(file.file.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button 
                              onClick={() => removeAttachment(file.id)}
                              className="absolute -top-2 -right-2 bg-gray-900 rounded-full p-1 border border-gray-700 text-gray-400 hover:text-white hover:bg-red-900 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <PlaceholdersAndVanishInput
                      placeholders={placeholders}
                      onChange={handleInputChange}
                      onSubmit={handleInputSubmit}
                      value={inputValue}
                      className="mb-8"
                      rightElement={
                        <button
                          type="button"
                          onClick={handleAttachButtonClick}
                          className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                          title="파일 첨부"
                        >
                          <Paperclip className="h-5 w-5" />
                        </button>
                      }
                    />
                    
                    {/* 숨겨진 파일 입력 필드 */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
                    />

                    <p className="text-gray-400 mb-8 max-w-2xl">
                      Elevate your coding, problem-solving, and analysis with our advanced AI assistant.
                      MCP Agent delivers powerful productivity enhancements through a diverse suite of tools.
                    </p>
                    
                    <div className="flex flex-wrap justify-center gap-3">

                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col glass rounded-lg shadow-xl overflow-hidden">
                {/* 채팅 헤더 - 간소화 */}
                <div className="bg-gray-900/80 p-3 flex justify-between items-center border-b border-gray-900">
                  <div className="flex items-center gap-3">
                    <h2 className="text-md font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-400" />
                      {activeConversation 
                        ? conversations.find(c => c.id === activeConversation)?.title
                        : '새 대화'}
                    </h2>
                    {selectedModel && (
                      <div 
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-900/50 text-xs text-indigo-200 cursor-pointer hover:bg-indigo-900/80 transition-colors"
                        onClick={() => setActiveSettings('model')}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                        <span>{selectedModel}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowChat(false)}
                    className="hover:bg-gray-800"
                  >
                    <span className="sr-only">닫기</span>
                    <PlusIcon className="rotate-45 h-4 w-4" />
                  </Button>
                </div>
                
                {/* 채팅 인터페이스 */}
                <div className="flex-1 overflow-hidden">
                  <ChatInterface 
                    key={chatSessionId}
                    modelId={selectedModel}
                    initialMessage={savedInitialMessage}
                    initialAttachments={savedAttachments.length > 0 ? savedAttachments : undefined}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* 상태 표시줄 - AWS 정보로 수정 */}
          <div className="bg-gray-900/80 border-t border-gray-900 p-2 px-4 text-xs text-gray-500 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-1 md:mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M14 5c.5 1.5 1.5 2 2.5 2h1a3 3 0 0 1 0 6h-.5A5.5 5.5 0 0 1 14 7.5V5Z"/><path d="M6 8h2a2 2 0 0 0 0-4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2a4 4 0 0 1-4 4v4h-2.5"/><path d="M4 14a4 4 0 0 1 4-4"/></svg>
              <span className="font-medium">POWERED BY AWS</span>
            </div>
            <div className="mb-1 md:mb-0">
              <span>Designed and built by the AWS KOREA PACE Team</span>
            </div>
            <div>
              <span>&copy; 2025 Amazon Web Services, Inc. All rights reserved.</span>
            </div>
          </div>
        </div>
      </SidebarProvider>
      
      {/* 설정 다이얼로그 */}
      <Dialog 
        open={activeSettings !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setActiveSettings(null);
            setTempSelectedModel(''); // 취소 시 임시 모델 선택 초기화
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="space-y-1">
                <DialogTitle asChild>
                  <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400">
                    {dialogConfig.title}
                  </h2>
                </DialogTitle>
                <DialogDescription asChild>
                  <p className="text-sm text-gray-400">{dialogConfig.description}</p>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            {activeSettings === 'tools' && (
              <MCPToolManager onSettingsChanged={handleSettingsChanged} />
            )}
            {activeSettings === 'prompt' && (
              <SystemPromptEditor onSettingsChanged={handleSettingsChanged} />
            )}
            {activeSettings === 'model' && (
              <ModelSelector
                selectedModel={tempSelectedModel || selectedModel}
                onChange={(modelId) => {
                  setTempSelectedModel(modelId);
                  setNeedReinit(true);
                }}
              />
            )}
            {activeSettings === 'user' && (
              <UserSettings 
                onSettingsChanged={() => {
                  // 사용자 설정이 변경되면 즉시 적용
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
            )}
            {activeSettings === 'help' && (
              <HelpPanel />
            )}
          </div>
          
          <DialogFooter>
            {needReinit && activeSettings !== 'user' && activeSettings !== 'prompt' && activeSettings !== 'tools' && (
              <Button onClick={handleApplySettings} className="w-full gradient-button">
                설정 적용 & 에이전트 재시작
              </Button>
            )}
            {(!needReinit || activeSettings === 'user') && (
              <DialogClose asChild>
                <Button variant="outline" className="border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white">닫기</Button>
              </DialogClose>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 경고 대화상자 - 새 대화 시작 확인 */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>대화 내용 초기화</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              새 대화를 시작하면 현재 대화 내용이 모두 초기화되고, 에이전트가 재시작됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
              onClick={() => {
                // 현재 대화가 있는 상태에서 새 대화 시작
                // 저장된 임시 메시지와 첨부 파일(있는 경우만)로 새 대화 초기화
                const hasInitialData = !!pendingInitialMessage || pendingAttachments.length > 0;
                
                // 새 대화 초기화 함수 호출
                initializeNewChat(
                  hasInitialData ? pendingInitialMessage : undefined, 
                  hasInitialData ? pendingAttachments : []
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
      
      {/* 모바일에서는 확장 가능한 채팅 인터페이스 */}
      <div className="md:hidden">
        <ExpandableChat position="bottom-right" size="lg">
          <ExpandableChatHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              새 대화
            </h3>
          </ExpandableChatHeader>
          <ExpandableChatBody className="bg-transparent">
            <ChatInterface key={chatSessionId} modelId={selectedModel} />
          </ExpandableChatBody>
        </ExpandableChat>
      </div>
    </div>
  );
}
