"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronRight, Wrench, Cog, ArrowDown, Paperclip, X, FileIcon, File, Download, ExternalLink } from "lucide-react"
import {
  ChatBubble,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble"
import { ChatMessageList } from "@/components/ui/chat-message-list"
import { MessageLoading } from "@/components/ui/message-loading"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"
import { v4 as uuidv4 } from 'uuid'

type MessageChunk = {
  type: "text" | "tool_use" | "tool_result" | "image" | "document";
  text?: string;
  name?: string;
  input?: string;
  image_data?: string;
  mime_type?: string;
  id?: string;
  index: number;
  filename?: string;
}

type StreamData = {
  chunk: MessageChunk[];
  toolCalls: null | unknown;
  metadata: {
    langgraph_node: string;
    langgraph_step: number;
    type: string;
    is_image?: boolean;
    image_data?: string;
    mime_type?: string;
  }
}

// 각 컨텐츠 아이템 타입
// 텍스트 컨텐츠 아이템
interface TextContentItem {
  id: string;
  type: "text";
  content: string;
  timestamp: number;
}

// 도구 사용 컨텐츠 아이템
interface ToolUseContentItem {
  id: string;
  type: "tool_use";
  name: string;
  input: string;
  timestamp: number;
  collapsed?: boolean;
}

// 도구 결과 컨텐츠 아이템
interface ToolResultContentItem {
  id: string;
  type: "tool_result";
  result: string;
  timestamp: number;
  collapsed?: boolean;
}

// 이미지 컨텐츠 아이템
interface ImageContentItem {
  id: string;
  type: "image";
  imageData: string;
  mimeType: string;
  timestamp: number;
}

// 문서 컨텐츠 아이템 추가
interface DocumentContentItem {
  id: string;
  type: "document";
  filename: string;
  fileType: string;
  fileSize: number;
  timestamp: number;
  fileUrl?: string; // 문서 파일의 URL (있는 경우)
  fileId?: string; // IndexedDB에 저장된 파일의 ID
}

// 파일 첨부 아이템 타입
interface FileAttachment {
  id: string;
  file: File;
  type: string;
  previewUrl?: string;
  fileId?: string; // IndexedDB에 저장된 파일의 ID
}

// 모든 컨텐츠 아이템 유니온 타입
type ContentItem = TextContentItem | ToolUseContentItem | ToolResultContentItem | ImageContentItem | DocumentContentItem;

// 확대된 이미지 보기를 위한 상태 인터페이스
interface ZoomedImageState {
  isOpen: boolean;
  imageData: string;
  mimeType: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  content: string; // 전체 텍스트 내용 (표시용)
  contentItems: ContentItem[]; // 시간순 정렬된 모든 컨텐츠 아이템
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  modelId?: string;
  initialMessage?: string;
  initialAttachments?: FileAttachment[];
}

export function ChatInterface({ modelId = "claude-3-sonnet", initialMessage, initialAttachments }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<ZoomedImageState>({
    isOpen: false,
    imageData: "",
    mimeType: ""
  });
  // 파일 첨부 관련 상태 추가
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // IndexedDB 관련 상태 추가
  const [dbReady, setDbReady] = useState<boolean>(false);
  const dbRef = useRef<IDBDatabase | null>(null);
  
  // 스크롤 관련 상태 추가
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 사용자 스크롤 제어 관련 상태 추가
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const isNearBottomRef = useRef(true);
  
  // 현재 스트리밍 응답 ID 참조
  const streamingMessageIdRef = useRef<string | null>(null);
  
  // 새 텍스트 페이드 지속 시간 (밀리초)
  const FADE_DURATION = 800;
  
  // 입력 필드에 대한 참조 추가
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 초기 메시지 처리 플래그
  const initialMessageProcessedRef = useRef<boolean>(false);
  
  // IndexedDB 초기화
  useEffect(() => {
    const initDb = async () => {
      try {
        const request = indexedDB.open('ChatFilesDB', 1);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // 파일 저장을 위한 객체 저장소 생성
          if (!db.objectStoreNames.contains('files')) {
            db.createObjectStore('files', { keyPath: 'id' });
            console.log('IndexedDB: files 스토어 생성됨');
          }
        };
        
        request.onsuccess = (event) => {
          console.log('IndexedDB 연결 성공');
          dbRef.current = (event.target as IDBOpenDBRequest).result;
          setDbReady(true);
        };
        
        request.onerror = (event) => {
          console.error('IndexedDB 연결 실패:', (event.target as IDBOpenDBRequest).error);
        };
      } catch (error) {
        console.error('IndexedDB 초기화 오류:', error);
      }
    };
    
    initDb();
    
    // 컴포넌트 언마운트 시 DB 연결 종료
    return () => {
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
    };
  }, []);
  
  // 파일 저장 함수
  const saveFileToIndexedDB = async (file: File, fileId: string): Promise<boolean> => {
    if (!dbRef.current || !dbReady) {
      console.error('IndexedDB가 준비되지 않았습니다.');
      return false;
    }
    
    try {
      // 먼저 파일을 ArrayBuffer로 읽기
      const arrayBuffer = await readFileAsArrayBuffer(file);
      if (!arrayBuffer) {
        console.error('파일을 ArrayBuffer로 읽을 수 없습니다.');
        return false;
      }
      
      // 파일 데이터 생성
      const fileData = {
        id: fileId,
        name: file.name,
        type: file.type,
        data: arrayBuffer,
        size: file.size,
        timestamp: Date.now()
      };
      
      // 데이터가 준비된 후 트랜잭션 시작
      const transaction = dbRef.current.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      return new Promise((resolve) => {
        const request = store.add(fileData);
        
        request.onsuccess = () => {
          console.log('파일이 IndexedDB에 저장됨:', fileId);
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('파일 저장 실패:', request.error);
          resolve(false);
        };
        
        // 트랜잭션 완료 이벤트 추가
        transaction.oncomplete = () => {
          console.log('트랜잭션 완료:', fileId);
        };
        
        transaction.onerror = () => {
          console.error('트랜잭션 오류:', transaction.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('IndexedDB 저장 오류:', error);
      return false;
    }
  };
  
  // 파일을 ArrayBuffer로 읽는 헬퍼 함수
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          console.error('파일 읽기 결과가 ArrayBuffer가 아닙니다.');
          resolve(null);
        }
      };
      
      reader.onerror = () => {
        console.error('파일 읽기 실패:', reader.error);
        resolve(null);
      };
      
      reader.readAsArrayBuffer(file);
    });
  };
  
  // 파일 가져오기 함수
  const getFileFromIndexedDB = async (fileId: string): Promise<Blob | null> => {
    if (!dbRef.current || !dbReady) {
      console.error('IndexedDB가 준비되지 않았습니다.');
      return null;
    }
    
    try {
      const transaction = dbRef.current.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      return new Promise((resolve) => {
        const request = store.get(fileId);
        
        request.onsuccess = () => {
          if (request.result) {
            const fileData = request.result;
            const blob = new Blob([fileData.data], { type: fileData.type });
            resolve(blob);
          } else {
            console.error('파일을 찾을 수 없음:', fileId);
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('파일 가져오기 실패:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('IndexedDB 읽기 오류:', error);
      return null;
    }
  };
  
  // 파일 열기 함수
  const openFileInNewTab = async (fileId: string, fileName: string) => {
    try {
      const fileBlob = await getFileFromIndexedDB(fileId);
      
      if (fileBlob) {
        // Blob URL 생성
        const blobUrl = URL.createObjectURL(fileBlob);
        
        // 새 탭에서 열기
        window.open(blobUrl, '_blank');
        
        // 약간의 지연 후 Blob URL 해제 (이미 열린 후에는 필요 없음)
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      } else {
        alert(`파일을 찾을 수 없습니다: ${fileName}`);
      }
    } catch (error) {
      console.error('파일 열기 오류:', error);
      alert('파일을 열 수 없습니다.');
    }
  };
  
  // 대화 초기화 감지
  useEffect(() => {
    // 초기 검사: localStorage에서 초기화 플래그 확인
    const checkResetFlag = () => {
      const resetFlag = localStorage.getItem('mcp_reset_conversation');
      if (resetFlag === 'true') {
        console.log('대화 초기화 플래그 감지: 메시지 초기화 중...');
        // 메시지 초기화
        setMessages([]);
        // 첨부 파일 초기화
        setAttachments([]);
        // 초기화 플래그 제거
        localStorage.removeItem('mcp_reset_conversation');
        // 스트리밍 중인 경우 중단
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          setIsStreaming(false);
          streamingMessageIdRef.current = null;
        }
        // 초기 메시지 처리 플래그 재설정
        initialMessageProcessedRef.current = false;
      }
    };
    
    // 초기 검사 실행
    checkResetFlag();
    
    // CustomEvent 리스너
    const handleResetEvent = () => {
      console.log('대화 초기화 이벤트 감지');
      checkResetFlag();
    };
    
    // 로컬스토리지 변경 이벤트 리스너 (다른 탭/창과의 동기화를 위해)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mcp_reset_conversation' && e.newValue === 'true') {
        checkResetFlag();
      }
    };
    
    // 리스너 등록
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mcp_reset_conversation', handleResetEvent);
    
    // 정리 함수
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mcp_reset_conversation', handleResetEvent);
    };
  }, []);
  
  // 하단으로 스크롤하는 함수
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
      
      // 사용자 스크롤 상태 초기화
      setUserHasScrolled(false);
      isNearBottomRef.current = true;
    }
  };

  // 스크롤 위치 감지 함수 개선
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    // 스크롤 버튼 표시 여부 설정
    setShowScrollButton(!isNearBottom);
    
    // 사용자 스크롤 상태 업데이트
    if (!isNearBottom && !userHasScrolled) {
      setUserHasScrolled(true);
      console.log("사용자가 위로 스크롤함 - 자동 스크롤 비활성화");
    } else if (isNearBottom && userHasScrolled) {
      setUserHasScrolled(false);
      console.log("사용자가 하단으로 스크롤함 - 자동 스크롤 재활성화");
    }
    
    // 하단 근처 상태 저장
    isNearBottomRef.current = isNearBottom;
  };
  
  // 메시지가 추가되거나 변경될 때마다 조건부 스크롤 로직 개선
  useEffect(() => {
    if (messages.length > 0) {
      // 사용자가 스크롤을 위로 올리지 않았거나, 이미 하단 근처에 있는 경우에만 자동 스크롤
      if (!userHasScrolled || isNearBottomRef.current) {
        scrollToBottom();
      } else {
        console.log("사용자가 위로 스크롤한 상태 - 자동 스크롤 생략");
      }
    }
  }, [messages, userHasScrolled]);

  // 스트리밍이 시작될 때 항상 스크롤 다운
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [isStreaming]);
  
  // 컴포넌트 마운트 시 스크롤 이벤트 리스너 등록
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);
  
  // 애니메이션 키프레임 생성
  const getAnimationStyles = () => `
    @keyframes fadeIn {
      from { 
        opacity: 0;
        transform: translateY(2px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .fade-in {
      animation: fadeIn ${FADE_DURATION/1000}s ease-out forwards;
    }
  `;
  
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // 초기 메시지 및 첨부 파일 처리
  useEffect(() => {
    // 컴포넌트가 마운트되고 초기 메시지가 있으면서 아직 처리되지 않은 경우
    if ((initialMessage || (initialAttachments && initialAttachments.length > 0)) && !initialMessageProcessedRef.current && !isStreaming && messages.length === 0 && dbReady) {
      initialMessageProcessedRef.current = true;
      
      console.log("초기 메시지/첨부파일 처리 시작:", {
        hasInitialMessage: !!initialMessage,
        attachmentsCount: initialAttachments?.length || 0,
        hasPreviewUrls: initialAttachments?.some(a => !!a.previewUrl) || false
      });
      
      // localStorage에서 초기 메시지 삭제 (중복 실행 방지)
      localStorage.removeItem('mcp_initial_message');
      localStorage.removeItem('mcp_initial_attachments');
      
      // 기존 첨부 파일 목록 초기화
      setAttachments([]);
      
      // 약간의 지연 후 메시지 전송 (UI가 준비된 후)
      setTimeout(async () => {
        try {
          // 사용자 메시지 컨텐츠 아이템 생성
          const contentItems: ContentItem[] = [];
          
          // 텍스트 메시지 추가
          if (initialMessage && initialMessage.trim()) {
            contentItems.push({
              id: uuidv4(),
              type: "text",
              content: initialMessage,
              timestamp: Date.now()
            });
          }
          
          // 첨부 파일 처리
          if (initialAttachments && initialAttachments.length > 0) {
            console.log("초기 첨부 파일 수:", initialAttachments.length);
            
            // 모든 첨부 파일에 대해 처리
            for (const attachment of initialAttachments) {
              // IndexedDB에 파일 저장 준비
              const fileId = uuidv4();
              
              // IndexedDB에 파일 저장
              try {
                await saveFileToIndexedDB(attachment.file, fileId);
              } catch (error) {
                console.error('초기 파일 저장 실패:', error);
              }
              
              if (attachment.type.startsWith('image/') && attachment.previewUrl) {
                console.log("초기 첨부 이미지 처리:", attachment.file.name);
                
                // previewUrl이 data URL 형식인지 확인
                if (attachment.previewUrl.startsWith('data:image/')) {
                  // data:image/xxx;base64, 형식에서 base64 부분만 추출
                  const base64Data = attachment.previewUrl.split(',')[1];
                  
                  if (base64Data) {
                    const imageId = uuidv4();
                    contentItems.push({
                      id: imageId,
                      type: "image",
                      imageData: base64Data,
                      mimeType: attachment.type,
                      timestamp: Date.now()
                    });
                    console.log("초기 이미지 데이터 추출 성공:", {
                      id: imageId,
                      name: attachment.file.name,
                      dataLength: base64Data.length
                    });
                  } else {
                    console.error("초기 이미지 데이터 추출 실패:", attachment.file.name);
                    contentItems.push({
                      id: uuidv4(),
                      type: "text",
                      content: `[이미지 데이터 오류: ${attachment.file.name}]`,
                      timestamp: Date.now()
                    });
                  }
                } 
                else if (attachment.previewUrl.startsWith('blob:')) {
                  // 이 코드는 수정 후 쓰이지 않아야 함 (data URL로 모두 변환됨)
                  console.error("Blob URL 감지됨 - 이 코드가 실행되면 안됨:", attachment.file.name);
                  console.error("page.tsx에서 blob URL이 data URL로 변환되지 않았습니다.");
                  contentItems.push({
                    id: uuidv4(),
                    type: "text",
                    content: `[이미지 형식 오류(blob URL): ${attachment.file.name}]`,
                    timestamp: Date.now()
                  });
                }
                else {
                  console.error("초기 이미지 URL 형식 오류 (data:image/ 형식이 아님):", attachment.previewUrl.substring(0, 20) + '...');
                  contentItems.push({
                    id: uuidv4(),
                    type: "text",
                    content: `[이미지 형식 오류: ${attachment.file.name}]`,
                    timestamp: Date.now()
                  });
                }
              } else {
                // 이미지가 아닌 파일은 문서 타입으로 추가
                contentItems.push({
                  id: uuidv4(),
                  type: "document",
                  filename: attachment.file.name,
                  fileType: attachment.file.type || getFileTypeFromExtension(attachment.file.name),
                  fileSize: attachment.file.size,
                  timestamp: Date.now(),
                  fileUrl: generateFileUrl(attachment.file.name),
                  fileId: fileId // IndexedDB에 저장된 파일의 ID
                });
              }
            }
          }
          
          // 사용자 메시지 내용 조합
          let messageContent = initialMessage || "";
          if (initialAttachments && initialAttachments.length > 0) {
            const fileNames = initialAttachments.map(a => a.file.name).join(', ');
            if (messageContent.trim()) {
              messageContent += `\n[첨부 파일: ${fileNames}]`;
            } else {
              messageContent = `[첨부 파일: ${fileNames}]`;
            }
          }
          
          // 사용자 메시지 추가
          const userMessage: Message = {
            id: uuidv4(),
            content: messageContent,
            sender: "user",
            contentItems: contentItems
          };
          
          console.log("초기화 메시지 생성 완료:", {
            id: userMessage.id,
            content: userMessage.content,
            contentItemsCount: userMessage.contentItems.length,
            contentTypes: userMessage.contentItems.map(item => item.type)
          });
          
          // 상태 업데이트 전 이미지 확인
          const imageItems = contentItems.filter(item => item.type === "image") as ImageContentItem[];
          console.log(`이미지 아이템 수: ${imageItems.length}`, imageItems.map(img => ({
            id: img.id,
            dataLength: img.imageData.length,
            mimeType: img.mimeType
          })));
          
          // 메시지 추가
          setMessages([userMessage]);
          
          // 스트리밍 호출 전 contentItems 상태 확인
          console.log("스트리밍 시작 전 contentItems:", contentItems.map(item => ({
            type: item.type,
            ...(item.type === "image" ? { dataLen: (item as ImageContentItem).imageData.length } : {})
          })));
          
          // 하단으로 스크롤
          setTimeout(() => scrollToBottom(false), 100);
          
          // SSE 연결을 통한 스트리밍 시작
          const attachmentsCopy = initialAttachments ? [...initialAttachments] : [];
          startStreaming(initialMessage || "", attachmentsCopy);
        } catch (error) {
          console.error("초기 메시지 처리 중 오류:", error);
        }
      }, 300);
    }
  }, [initialMessage, initialAttachments, isStreaming, messages.length, dbReady]);
  
  // 입력 상태 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  // 파일 첨부 핸들러를 완전히 새로 작성
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // 파일 배열 복사
    const files = Array.from(e.target.files);
    
    // 각 파일 처리
    for (const file of files) {
      // 파일 ID 생성
      const fileId = uuidv4();
      
      // IndexedDB에 파일 저장
      if (dbReady) {
        try {
          await saveFileToIndexedDB(file, fileId);
        } catch (error) {
          console.error('파일 저장 실패:', error);
        }
      }
      
      // 이미지 파일인 경우
      if (file.type.startsWith('image/')) {
        // FileReader 생성
        const reader = new FileReader();
        
        // 로드 완료 시 콜백
        reader.onload = () => {
          const result = reader.result as string;
          
          // 새 첨부 파일 생성 및 추가
          const newAttachment: FileAttachment = {
            id: uuidv4(),
            file: file,
            type: file.type,
            previewUrl: result,
            fileId: fileId
          };
          
          // 첨부 파일 목록에 추가
          setAttachments(prev => [...prev, newAttachment]);
          console.log("이미지 첨부 완료:", {
            name: file.name,
            type: file.type,
            size: file.size,
            previewUrl: result.substring(0, 50) + '...',
            fileId: fileId
          });
        };
        
        // 에러 핸들러
        reader.onerror = (error) => {
          console.error("FileReader 오류:", error);
        };
        
        // 파일을 data URL로 읽기 시작
        reader.readAsDataURL(file);
      } else {
        // 이미지가 아닌 파일은 바로 추가
        setAttachments(prev => [...prev, {
          id: uuidv4(),
          file: file,
          type: file.type,
          fileId: fileId
        }]);
      }
    }
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // 첨부 파일 제거 핸들러
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const updated = prev.filter(file => file.id !== id);
      
      // 제거할 파일의 미리보기 URL 해제
      const fileToRemove = prev.find(file => file.id === id);
      if (fileToRemove?.previewUrl) {
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
  
  // 파일 확장자로부터 타입 추측
  const getFileTypeFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'html': 'text/html'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  };

  // 파일 아이콘 선택 함수 개선
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('word') || fileType.includes('doc')) return 'doc';
    if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('xls') || fileType.includes('csv')) return 'sheet';
    if (fileType.includes('text') || fileType.includes('markdown') || fileType.includes('txt') || fileType.includes('md')) return 'text';
    if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg') || fileType.includes('jpeg') || fileType.includes('gif')) return 'image';
    if (fileType.includes('html') || fileType.includes('htm')) return 'html';
    if (fileType.includes('json') || fileType.includes('xml')) return 'code';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar') || fileType.includes('gz')) return 'archive';
    if (fileType.includes('ppt') || fileType.includes('presentation')) return 'presentation';
    return 'generic';
  };
  
  // 폼 제출 핸들러에서 이미지 처리 부분 수정
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;

    console.log("폼 제출 시작:", { 
      hasInput: !!input.trim(), 
      attachmentsCount: attachments.length 
    });

    // 사용자 메시지 컨텐츠 아이템 생성
    const contentItems: ContentItem[] = [];
    
    // 텍스트 메시지 추가
    if (input.trim()) {
      contentItems.push({
        id: uuidv4(),
        type: "text",
        content: input,
        timestamp: Date.now()
      });
    }
    
    // 첨부 파일도 사용자 메시지 컨텐츠에 추가
    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/') && attachment.previewUrl) {
        console.log("첨부 이미지 처리:", attachment.file.name);
        
        // previewUrl이 data URL 형식인지 확인
        if (attachment.previewUrl.startsWith('data:image/')) {
          // data:image/xxx;base64, 형식에서 base64 부분만 추출
          const base64Data = attachment.previewUrl.split(',')[1];
          
          if (base64Data) {
            const imageItemId = uuidv4();
            contentItems.push({
              id: imageItemId,
              type: "image",
              imageData: base64Data,
              mimeType: attachment.type,
              timestamp: Date.now()
            });
            console.log("이미지 데이터 추출 성공:", {
              id: imageItemId,
              name: attachment.file.name,
              dataLength: base64Data.length
            });
          }
        } 
        else if (attachment.previewUrl.startsWith('blob:')) {
          // 이 코드는 수정 후 쓰이지 않아야 함 (data URL로 모두 변환됨)
          console.error("Blob URL 감지됨 - 이 코드가 실행되면 안됨:", attachment.file.name);
          console.error("page.tsx에서 blob URL이 data URL로 변환되지 않았습니다.");
          contentItems.push({
            id: uuidv4(),
            type: "text",
            content: `[이미지 형식 오류(blob URL): ${attachment.file.name}]`,
            timestamp: Date.now()
          });
        }
        else {
          console.error("이미지 URL 형식 오류 (data:image/ 형식이 아님):", attachment.previewUrl.substring(0, 20) + '...');
          contentItems.push({
            id: uuidv4(),
            type: "text",
            content: `[이미지 형식 오류: ${attachment.file.name}]`,
            timestamp: Date.now()
          });
        }
      } else {
        // 이미지가 아닌 파일은 문서 아이템으로 추가
        contentItems.push({
          id: uuidv4(),
          type: "document",
          filename: attachment.file.name,
          fileType: attachment.file.type || getFileTypeFromExtension(attachment.file.name),
          fileSize: attachment.file.size,
          timestamp: Date.now(),
          fileUrl: generateFileUrl(attachment.file.name),
          fileId: attachment.fileId // IndexedDB 파일 ID 추가
        });
      }
    }
    
    // 사용자 메시지 내용 조합
    let messageContent = input;
    if (attachments.length > 0) {
      const fileNames = attachments.map(a => a.file.name).join(', ');
      if (messageContent.trim()) {
        messageContent += `\n[첨부 파일: ${fileNames}]`;
      } else {
        messageContent = `[첨부 파일: ${fileNames}]`;
      }
    }

    // 사용자 메시지 추가
    const userMessage: Message = {
      id: uuidv4(),
      content: messageContent,
      sender: "user",
      contentItems: contentItems
    };
    
    console.log("사용자 메시지 생성:", {
      id: userMessage.id,
      contentItems: userMessage.contentItems.map(item => ({
        type: item.type,
        ...(item.type === "image" ? {
          imageData: "데이터 있음 (" + (item as ImageContentItem).imageData.length + " 바이트)"
        } : {})
      }))
    });
    
    // 메시지를 먼저 추가하고 화면에 표시
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    // 보낼 첨부 파일 복사본 저장
    const attachmentsCopy = [...attachments];
    
    // 첨부 파일 목록 초기화 (UI에서 먼저 비우기)
    setAttachments([]);
    
    // SSE 연결을 통한 스트리밍 시작 (복사본 사용)
    startStreaming(input, attachmentsCopy);
    
    // 하단으로 스크롤
    setTimeout(() => scrollToBottom(), 100);
  };
  
  // 메시지가 추가되거나 변경될 때마다 스크롤
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages, showScrollButton]);

  // 컴포넌트 마운트 시 스크롤 이벤트 리스너 등록
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  const startStreaming = (query: string, files: FileAttachment[] = []) => {
    setIsStreaming(true);
    
    // 새로운 AI 메시지 생성 및 추가
    const newAiMessageId = uuidv4();
    streamingMessageIdRef.current = newAiMessageId;
    
    setMessages(prev => [
      ...prev,
      {
        id: newAiMessageId,
        content: "",
        sender: "ai",
        contentItems: [],
        isStreaming: true
      }
    ]);
    
    // EventSource를 통한 스트리밍 연결
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // 파일 형식 및 크기 검증
    const validateFiles = (files: FileAttachment[]) => {
      const allowedDocFormats = ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'txt', 'md'];
      const allowedImageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      const maxIndividualSize = 4.5 * 1024 * 1024; // 4.5MB
      const maxTotalSize = 25 * 1024 * 1024; // 25MB
      
      let totalSize = 0;
      const errors: string[] = [];
      
      for (const attachment of files) {
        // 확장자 체크
        const fileName = attachment.file.name;
        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
        const isValidFormat = [...allowedDocFormats, ...allowedImageFormats].includes(fileExt);
        
        if (!isValidFormat) {
          errors.push(`"${fileName}": 지원하지 않는 파일 형식입니다. 지원 형식: 문서(${allowedDocFormats.join(', ')}), 이미지(${allowedImageFormats.join(', ')})`);
          continue;
        }
        
        // 개별 파일 크기 체크
        if (attachment.file.size > maxIndividualSize) {
          errors.push(`"${fileName}": 파일 크기가 너무 큽니다 (최대 4.5MB).`);
          continue;
        }
        
        totalSize += attachment.file.size;
      }
      
      // 전체 크기 체크
      if (totalSize > maxTotalSize) {
        errors.push(`전체 첨부 파일 크기가 제한(25MB)을 초과했습니다.`);
      }
      
      return { valid: errors.length === 0, errors };
    };
    
    // 파일이 있는 경우 FormData로 변환하여 전송
    if (files.length > 0) {
      // 파일 검증
      const validation = validateFiles(files);
      if (!validation.valid) {
        // 검증 실패 시 오류 메시지 표시
        setMessages(prev => {
          const newMessages = [...prev];
          const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
          
          if (currentMessageIndex === -1) return prev;
          
          const currentMessage = {...newMessages[currentMessageIndex]};
          currentMessage.content = "첨부 파일 오류:\n" + validation.errors.join('\n');
          currentMessage.contentItems = [{
            id: uuidv4(),
            type: "text",
            content: "첨부 파일 오류:\n" + validation.errors.join('\n'),
            timestamp: Date.now()
          }];
          currentMessage.isStreaming = false;
          
          newMessages[currentMessageIndex] = currentMessage;
          return newMessages;
        });
        
        setIsStreaming(false);
        return;
      }
      
      const fetchWithFiles = async () => {
        try {
          const formData = new FormData();
          formData.append('message', query);
          formData.append('stream', 'true');
          formData.append('model_id', modelId);
          
          // 파일 추가 (직접 파일 객체 전달)
          files.forEach(attachment => {
            console.log(`첨부 파일 추가: ${attachment.file.name} (${attachment.file.size} bytes, ${attachment.file.type})`);
            
            // 직접 파일 객체를 전달
            formData.append('files', attachment.file);
          });
          
          console.log("API 요청 - FormData:", {
            message: query,
            modelId: modelId,
            filesCount: files.length,
            fileNames: files.map(f => f.file.name).join(', ')
          });
          
          // fetch API로 폼 데이터 전송
          const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData,
            // FormData를 사용할 때는 Content-Type 헤더를 설정하지 않음
            // 브라우저가 자동으로 multipart/form-data 경계를 설정
          });
          
          if (!response.ok) {
            console.error(`API 요청 오류: ${response.status} ${response.statusText}`);
            
            // 응답 본문 확인 (가능한 경우)
            try {
              const errorBody = await response.text();
              console.error("오류 응답 본문:", errorBody);
            } catch (e) {
              console.error("오류 응답 본문을 읽을 수 없음:", e);
            }
            
            throw new Error(`API 요청 오류: ${response.status} ${response.statusText}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('응답 본문을 읽을 수 없습니다.');
          }
          
          const decoder = new TextDecoder();
          let buffer = '';
          
          // 스트림 데이터 처리
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // 버퍼에서 완전한 SSE 메시지를 찾아 처리
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // 'data: ' 접두사 확인
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') {
                  completeStreaming();
                } else {
                  processStreamChunk(data);
                }
              }
            }
          }
        } catch (error) {
          console.error('SSE 연결/처리 오류:', error);
          
          // 오류 메시지 표시
          setMessages(prev => {
            const newMessages = [...prev];
            const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
            
            if (currentMessageIndex === -1) return prev;
            
            const currentMessage = {...newMessages[currentMessageIndex]};
            currentMessage.content = `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
            currentMessage.contentItems = [{
              id: uuidv4(),
              type: "text",
              content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              timestamp: Date.now()
            }];
            currentMessage.isStreaming = false;
            
            newMessages[currentMessageIndex] = currentMessage;
            return newMessages;
          });
          
          completeStreaming();
        }
      };
      
      // 파일 있는 요청 실행
      fetchWithFiles();
    } else {
      // 기존 코드: 파일 없는 일반 요청
      // API 요청 데이터 준비
      const requestData = {
        message: query,
        stream: true,
        model_id: modelId
      };
      
      const fetchSSE = async () => {
        try {
          console.log("API 요청 데이터:", requestData);
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) {
            console.error(`API 요청 오류: ${response.status} ${response.statusText}`);
            
            // 응답 본문 확인 (가능한 경우)
            try {
              const errorBody = await response.text();
              console.error("오류 응답 본문:", errorBody);
            } catch (e) {
              console.error("오류 응답 본문을 읽을 수 없음:", e);
            }
            
            throw new Error(`API 요청 오류: ${response.status} ${response.statusText}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('응답 본문을 읽을 수 없습니다.');
          }
          
          const decoder = new TextDecoder();
          let buffer = '';
          
          // 스트림 데이터 처리
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // 버퍼에서 완전한 SSE 메시지를 찾아 처리
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // 'data: ' 접두사 확인
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') {
                  completeStreaming();
                } else {
                  processStreamChunk(data);
                }
              }
            }
          }
        } catch (error) {
          console.error('SSE 연결/처리 오류:', error);
          
          // 오류 메시지 표시
          setMessages(prev => {
            const newMessages = [...prev];
            const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
            
            if (currentMessageIndex === -1) return prev;
            
            const currentMessage = {...newMessages[currentMessageIndex]};
            currentMessage.content = `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
            currentMessage.contentItems = [{
              id: uuidv4(),
              type: "text",
              content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
              timestamp: Date.now()
            }];
            currentMessage.isStreaming = false;
            
            newMessages[currentMessageIndex] = currentMessage;
            return newMessages;
          });
          
          completeStreaming();
        }
      };
      
      // 스트리밍 시작
      fetchSSE();
    }
  }
  
  const processStreamChunk = (data: string) => {
    if (!data.trim()) return;
    
    try {
      console.log("받은 스트림 데이터:", data.substring(0, 100) + (data.length > 100 ? "..." : ""));
      
      if (data === "[DONE]") {
        console.log("스트림 완료 신호 수신: [DONE]");
        
        // 스트리밍 완료 시 모든 도구 결과 접기
        setMessages(prev => {
          const newMessages = [...prev];
          const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
          
          if (currentMessageIndex === -1) return prev;
          
          const currentMessage = {...newMessages[currentMessageIndex]};
          const contentItems = [...currentMessage.contentItems].map(item => {
            if (item.type === "tool_use" || item.type === "tool_result") {
              return {
                ...item,
                collapsed: true
              };
            }
            return item;
          });
          
          currentMessage.contentItems = contentItems;
          newMessages[currentMessageIndex] = currentMessage;
          return newMessages;
        });
        
        completeStreaming();
        return;
      }
      
      console.log("처리 중인 청크:", data);
      const parsedData: StreamData = JSON.parse(data.startsWith("data: ") ? data.substring(6) : data);
      // 유연한 parsing을 위해 chunk 속성이 있는지 확인
      const chunk = parsedData.chunk || [];
      
      console.log("파싱된 데이터:", parsedData);
      console.log("처리할 청크:", chunk);
      
      // 청크가 비어있으면 무시
      if (!chunk || chunk.length === 0) {
        console.log("빈 청크 무시");
        return;
      }
      
      setMessages(prev => {
        const newMessages = [...prev];
        const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
        
        if (currentMessageIndex === -1) return prev;
        
        const currentMessage = {...newMessages[currentMessageIndex]};
        const contentItems = [...currentMessage.contentItems];
        
        for (const item of chunk) {
          const timestamp = Date.now();
          
          if (item.type === "text") {
            const newText = item.text || "";
            if (newText.trim()) {
              // 전체 텍스트 내용 업데이트
              currentMessage.content += newText;
              
              // 컨텐츠 아이템 추가
              contentItems.push({
                id: uuidv4(),
                type: "text",
                content: newText,
                timestamp
              });
            }
          } else if (item.type === "tool_use") {
            if (item.name) {
              // 새 도구 사용 아이템 추가 (스트리밍 중에는 항상 펼쳐진 상태)
              contentItems.push({
                id: item.id || uuidv4(),
                type: "tool_use",
                name: item.name,
                input: item.input || "",
                timestamp,
                collapsed: false // 스트리밍 중에는 펼쳐진 상태
              });
            } else if (item.input !== undefined) {
              // 기존 도구 사용 아이템 업데이트
              const lastToolUseIndex = contentItems
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => item.type === "tool_use")
                .pop()?.idx;
              
              if (lastToolUseIndex !== undefined) {
                const lastToolUse = contentItems[lastToolUseIndex] as ToolUseContentItem;
                contentItems[lastToolUseIndex] = {
                  ...lastToolUse,
                  input: lastToolUse.input + (item.input || ""),
                  collapsed: false // 스트리밍 중에는 펼쳐진 상태 유지
                };
              }
            }
          } else if (item.type === "tool_result") {
            // 도구 결과 아이템 추가 (스트리밍 중에는 항상 펼쳐진 상태)
            contentItems.push({
              id: uuidv4(),
              type: "tool_result",
              result: item.text || "",
              timestamp,
              collapsed: false // 스트리밍 중에는 펼쳐진 상태
            });
          } else if (item.type === "image") {
            // 이미지 아이템 추가
            console.log("이미지 청크 감지:", item);
            contentItems.push({
              id: uuidv4(),
              type: "image",
              imageData: item.image_data || "",
              mimeType: item.mime_type || "image/png",
              timestamp
            });
            
            // 이미지 도착을 콘텐츠에도 표시
            currentMessage.content += "\n[이미지 생성됨]";
          }
        }
        
        // 컨텐츠 아이템 업데이트 및 시간순 정렬
        currentMessage.contentItems = contentItems.sort((a, b) => a.timestamp - b.timestamp);
        
        newMessages[currentMessageIndex] = currentMessage;
        return newMessages;
      });
    } catch (error) {
      console.error("Error processing stream chunk:", error, data);
    }
  }
  
  const completeStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
    
    // 스트리밍이 완료되었음을 표시하고 모든 도구를 접기
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.isStreaming) {
          // 모든 도구 접기
          const updatedContentItems = msg.contentItems.map(item => {
            if (item.type === "tool_use" || item.type === "tool_result") {
              return { ...item, collapsed: true };
            }
            return item;
          });
          
          return { 
            ...msg, 
            isStreaming: false,
            contentItems: updatedContentItems
          };
        }
        return msg;
      });
    });
  }
  
  // 도구 접기/펼치기 토글 함수
  const toggleToolCollapse = (messageId: string, itemId: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const messageIndex = newMessages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1) return prev;
      
      const message = {...newMessages[messageIndex]};
      const contentItems = [...message.contentItems].map(item => {
        if (item.id === itemId && (item.type === "tool_use" || item.type === "tool_result")) {
          return {
            ...item,
            collapsed: !item.collapsed
          };
        }
        return item;
      });
      
      message.contentItems = contentItems;
      newMessages[messageIndex] = message;
      return newMessages;
    });
  };
  
  // 컨텐츠 아이템 렌더링
  const renderContentItem = (item: ContentItem, index: number, isStreaming: boolean, messageId: string) => {
    const now = Date.now();
    const age = now - item.timestamp;
    const shouldAnimate = isStreaming && age < FADE_DURATION;
    
    // 텍스트 아이템 렌더링
    if (item.type === "text") {
      return (
        <span 
          key={item.id} 
          className={shouldAnimate ? "fade-in" : ""}
        >
          {item.content}
        </span>
      );
    }
    
    // 도구 사용 아이템 렌더링
    if (item.type === "tool_use") {
      const toolUseItem = item as ToolUseContentItem;
      const isCollapsed = toolUseItem.collapsed;
      
      return (
        <div 
          key={item.id} 
          className={`mt-4 mb-4 ${shouldAnimate ? "fade-in" : ""}`}
        >
          <div className="bg-gray-800/70 rounded-md p-3 text-xs border border-gray-700">
            <div className="font-medium text-gray-300 mb-1 flex justify-between items-center cursor-pointer" 
                onClick={() => toggleToolCollapse(messageId, item.id)}>
              <div className="flex items-center">
                <Wrench className="h-4 w-4 mr-1" />
                <span>도구 사용: {toolUseItem.name}</span>
              </div>
              {isCollapsed ? 
                <ChevronRight className="h-4 w-4 text-gray-400" /> : 
                <ChevronDown className="h-4 w-4 text-gray-400" />
              }
            </div>
            
            {!isCollapsed && (
              <div className="font-mono text-gray-400 overflow-auto max-h-40 bg-gray-900/70 p-2 rounded border border-gray-800 overflow-x-hidden">
                <pre className="text-xs text-green-400 whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      // 입력이 없거나 비어있는 경우
                      if (!toolUseItem.input || toolUseItem.input === '') {
                        return '도구 입력 데이터가 로딩 중...';
                      }
                      
                      // text_to_image 도구인 경우 특별 처리
                      if (toolUseItem.name === "text_to_image") {
                        // JSON 파싱을 시도하는 정규식 패턴 확인
                        const completedJson = /^\s*\{[\s\S]*\}\s*$/.test(toolUseItem.input);
                        
                        // 불완전한 JSON인 경우 원본 텍스트 출력
                        if (!completedJson) {
                          return `${toolUseItem.input} (데이터 로딩 중...)`;
                        }
                        
                        // 완전한 JSON인 경우 파싱 시도
                        const parsedInput = JSON.parse(toolUseItem.input);
                        return `{\n  "width": ${parsedInput.width || 1024},\n  "height": ${parsedInput.height || 1024},\n  "prompt": "${parsedInput.prompt || ''}",\n  "negative_prompt": "${parsedInput.negative_prompt || ''}"\n}`;
                      }
                      
                      // 문자열이 아닌 경우
                      if (typeof toolUseItem.input !== 'string') {
                        return JSON.stringify(toolUseItem.input, null, 2);
                      }
                      
                      // JSON 파싱을 시도하는 정규식 패턴 확인
                      const looksLikeJson = /^\s*[\{\[]/.test(toolUseItem.input) && /[\}\]]\s*$/.test(toolUseItem.input);
                      
                      if (looksLikeJson) {
                        try {
                          // 완전한 JSON으로 보이면 파싱 시도
                          const parsedJson = JSON.parse(toolUseItem.input);
                          return JSON.stringify(parsedJson, null, 2);
                        } catch {
                          // 파싱 실패 시 원본 그대로 출력
                          return toolUseItem.input;
                        }
                      } else {
                        // JSON으로 보이지 않으면 원본 그대로 출력
                        return toolUseItem.input;
                      }
                    } catch (error) {
                      console.error('JSON 파싱 오류:', error);
                      // 파싱 실패 시 원본 텍스트 출력
                      return toolUseItem.input;
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // 도구 결과 아이템 렌더링
    if (item.type === "tool_result") {
      const toolResultItem = item as ToolResultContentItem;
      const isCollapsed = toolResultItem.collapsed;
      
      return (
        <div 
          key={item.id} 
          className={`mt-4 mb-4 ${shouldAnimate ? "fade-in" : ""}`}
        >
          <div className="bg-gray-800/70 rounded-md p-3 text-xs border border-gray-700">
            <div className="font-medium text-gray-300 mb-1 flex justify-between items-center cursor-pointer"
                onClick={() => toggleToolCollapse(messageId, item.id)}>
              <div className="flex items-center">
                <Cog className="h-4 w-4 mr-1" />
                <span>도구 결과</span>
              </div>
              {isCollapsed ? 
                <ChevronRight className="h-4 w-4 text-gray-400" /> : 
                <ChevronDown className="h-4 w-4 text-gray-400" />
              }
            </div>
            
            {!isCollapsed && (
              <div className="font-mono text-gray-400 overflow-auto max-h-40 bg-gray-900/70 p-2 rounded border border-gray-800 overflow-x-hidden">
                <pre className="text-xs text-green-400 whitespace-pre-wrap break-all">{toolResultItem.result}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // 이미지 아이템 렌더링
    if (item.type === "image") {
      const imageItem = item as ImageContentItem;
      
      // 디버깅 정보 출력
      console.log("이미지 렌더링:", {
        id: imageItem.id,
        mimeType: imageItem.mimeType,
        dataLength: imageItem.imageData?.length || 0
      });
      
      if (!imageItem.imageData) {
        console.error("이미지 데이터 없음:", imageItem);
        return (
          <div key={imageItem.id} className="p-2 bg-red-900/30 rounded-md">
            <p className="text-red-300 text-xs">이미지 데이터 없음</p>
          </div>
        );
      }
      
      const imgSrc = `data:${imageItem.mimeType};base64,${imageItem.imageData}`;
      console.log("이미지 URL 생성:", imgSrc.substring(0, 50) + '...');
      
      // 이미지를 직접 렌더링
      return (
        <div key={imageItem.id} className="mt-2 mb-2 max-w-full">
          <img 
            src={imgSrc}
            alt="첨부 이미지"
            className="rounded-md border border-indigo-500/30 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxHeight: "200px" }}
            onClick={() => setZoomedImage({
              isOpen: true,
              imageData: imageItem.imageData,
              mimeType: imageItem.mimeType
            })}
            onLoad={() => console.log("이미지 로드 성공:", imageItem.id)}
            onError={(e) => {
              console.error("이미지 로드 오류:", e);
            }}
          />
        </div>
      );
    }
    
    // 문서 아이템 렌더링
    if (item.type === "document") {
      const documentItem = item as DocumentContentItem;
      const fileIcon = getFileIcon(documentItem.fileType);
      const fileSize = documentItem.fileSize < 1024 * 1024 
        ? `${Math.round(documentItem.fileSize / 1024)} KB` 
        : `${(documentItem.fileSize / (1024 * 1024)).toFixed(1)} MB`;
      
      const fileExtension = documentItem.filename.split('.').pop()?.toUpperCase() || '';
      
      return (
        <div key={documentItem.id} className={`mt-2 mb-2 ${shouldAnimate ? "fade-in" : ""}`}>
          <div className="flex border border-gray-700 bg-gray-800/50 rounded-md p-3 max-w-[350px]">
            <div className="mr-3 h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md bg-indigo-900/40">
              {fileIcon === 'pdf' && <FileIcon className="h-5 w-5 text-red-400" />}
              {fileIcon === 'doc' && <FileIcon className="h-5 w-5 text-blue-400" />}
              {fileIcon === 'sheet' && <FileIcon className="h-5 w-5 text-green-400" />}
              {fileIcon === 'text' && <FileIcon className="h-5 w-5 text-gray-400" />}
              {fileIcon === 'image' && <FileIcon className="h-5 w-5 text-purple-400" />}
              {fileIcon === 'html' && <FileIcon className="h-5 w-5 text-orange-400" />}
              {fileIcon === 'code' && <FileIcon className="h-5 w-5 text-cyan-400" />}
              {fileIcon === 'archive' && <FileIcon className="h-5 w-5 text-yellow-400" />}
              {fileIcon === 'presentation' && <FileIcon className="h-5 w-5 text-pink-400" />}
              {fileIcon === 'generic' && <FileIcon className="h-5 w-5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {documentItem.filename}
                </p>
                <p className="ml-2 text-xs text-gray-400 whitespace-nowrap">{fileExtension}</p>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">
                  {fileSize}
                </p>
                <button 
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center"
                  onClick={() => {
                    if (documentItem.fileId) {
                      openFileInNewTab(documentItem.fileId, documentItem.filename);
                    } else if (documentItem.fileUrl) {
                      window.open(documentItem.fileUrl, '_blank', 'noopener,noreferrer');
                    } else {
                      alert('이 파일은 현재 볼 수 없습니다.');
                    }
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  <span>보기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // 페이드 효과를 위한 주기적 리렌더링
  useEffect(() => {
    if (!isStreaming) return;
    
    const timer = setInterval(() => {
      setMessages(prev => [...prev]);
    }, 50);
    
    return () => clearInterval(timer);
  }, [isStreaming]);
  
  // 컴포넌트 언마운트 시 연결 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  // 컴포넌트 마운트 시 채팅창에 포커스 설정
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // 파일 URL 생성 함수 (실제 환경에서는 서버에서 반환된 URL을 사용)
  const generateFileUrl = (filename: string): string => {
    // 이 함수는 데모용으로 가상의 URL을 생성합니다.
    // 실제 환경에서는 서버에서 반환된 URL을 사용해야 합니다.
    const fileExt = filename.split('.').pop()?.toLowerCase() || '';
    
    // 확장자에 따라 다른 샘플 URL 생성
    if (fileExt === 'pdf') {
      return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    } else if (fileExt === 'doc' || fileExt === 'docx') {
      return 'https://filesamples.com/samples/document/docx/sample3.docx';
    } else if (fileExt === 'xls' || fileExt === 'xlsx' || fileExt === 'csv') {
      return 'https://filesamples.com/samples/document/xlsx/sample1.xlsx';
    } else {
      // 텍스트 파일의 경우 GitHub의 샘플 README 보여주기
      return 'https://raw.githubusercontent.com/microsoft/vscode/main/README.md';
    }
  };
  
  return (
    <>
      <div className="flex h-full w-full overflow-hidden">
        {/* 페이드 인 애니메이션을 위한 스타일 */}
        <style dangerouslySetInnerHTML={{ __html: getAnimationStyles() + `
          .hide-scrollbar {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}} />
        
        <div className="flex flex-col w-full h-full">
          {/* 메시지 영역 */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto hide-scrollbar relative"
          >
            <div className="max-w-3xl mx-auto w-full p-4">
              <ChatMessageList>
                {messages.map((message) => {
                  console.log(`메시지 렌더링 ${message.id}:`, {
                    sender: message.sender,
                    contentItemsCount: message.contentItems.length,
                    contentTypes: message.contentItems.map(item => item.type)
                  });
                  
                  return message.sender === "user" ? (
                    <ChatBubble
                      key={message.id}
                      variant="sent"
                    >
                      {/* <ChatBubbleAvatar
                        src=""
                        fallback="U"
                        className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium"
                      /> */}
                      <div className="flex flex-col max-w-[80%]">
                        <ChatBubbleMessage variant="sent">
                          {message.contentItems.map((item) => {
                            if (item.type === "text") {
                              // 텍스트 아이템
                              return <div key={item.id}>{item.content}</div>;
                            } 
                            else if (item.type === "image") {
                              // 이미지 아이템
                              const imageItem = item as ImageContentItem;
                              
                              // 디버깅 정보 출력
                              console.log("사용자 메시지 이미지 렌더링:", {
                                id: imageItem.id,
                                mimeType: imageItem.mimeType,
                                dataLength: imageItem.imageData?.length || 0,
                                senderType: message.sender,
                                messageId: message.id
                              });
                              
                              if (!imageItem.imageData) {
                                console.error("이미지 데이터 없음:", imageItem);
                                return (
                                  <div key={imageItem.id} className="p-2 bg-red-900/30 rounded-md">
                                    <p className="text-red-300 text-xs">이미지 데이터 없음</p>
                                  </div>
                                );
                              }
                              
                              const imgSrc = `data:${imageItem.mimeType};base64,${imageItem.imageData}`;
                              console.log("이미지 URL 생성:", imgSrc.substring(0, 50) + '...');
                              
                              // 이미지를 직접 렌더링
                              return (
                                <div key={imageItem.id} className="mt-2 mb-2 max-w-full">
                                  <img 
                                    src={imgSrc}
                                    alt="첨부 이미지"
                                    className="rounded-md border border-indigo-500/30 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{ maxHeight: "200px" }}
                                    onClick={() => setZoomedImage({
                                      isOpen: true,
                                      imageData: imageItem.imageData,
                                      mimeType: imageItem.mimeType
                                    })}
                                    onLoad={() => console.log("이미지 로드 성공:", imageItem.id)}
                                    onError={(e) => {
                                      console.error("이미지 로드 오류:", e);
                                    }}
                                  />
                                </div>
                              );
                            }
                            else if (item.type === "document") {
                              // 문서 아이템
                              const documentItem = item as DocumentContentItem;
                              const fileIcon = getFileIcon(documentItem.fileType);
                              const fileSize = documentItem.fileSize < 1024 * 1024 
                                ? `${Math.round(documentItem.fileSize / 1024)} KB` 
                                : `${(documentItem.fileSize / (1024 * 1024)).toFixed(1)} MB`;
                              
                              const fileExtension = documentItem.filename.split('.').pop()?.toUpperCase() || '';
                              
                              return (
                                <div key={documentItem.id} className="mt-2 mb-2">
                                  <div className="flex border border-gray-700 bg-gray-800/50 rounded-md p-3 max-w-[350px]">
                                    <div className="mr-3 h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md bg-indigo-900/40">
                                      {fileIcon === 'pdf' && <FileIcon className="h-5 w-5 text-red-400" />}
                                      {fileIcon === 'doc' && <FileIcon className="h-5 w-5 text-blue-400" />}
                                      {fileIcon === 'sheet' && <FileIcon className="h-5 w-5 text-green-400" />}
                                      {fileIcon === 'text' && <FileIcon className="h-5 w-5 text-gray-400" />}
                                      {fileIcon === 'image' && <FileIcon className="h-5 w-5 text-purple-400" />}
                                      {fileIcon === 'html' && <FileIcon className="h-5 w-5 text-orange-400" />}
                                      {fileIcon === 'code' && <FileIcon className="h-5 w-5 text-cyan-400" />}
                                      {fileIcon === 'archive' && <FileIcon className="h-5 w-5 text-yellow-400" />}
                                      {fileIcon === 'presentation' && <FileIcon className="h-5 w-5 text-pink-400" />}
                                      {fileIcon === 'generic' && <FileIcon className="h-5 w-5 text-gray-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-200 truncate">
                                          {documentItem.filename}
                                        </p>
                                        <p className="ml-2 text-xs text-gray-400 whitespace-nowrap">{fileExtension}</p>
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-gray-400">
                                          {fileSize}
                                        </p>
                                        <button 
                                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center"
                                          onClick={() => {
                                            if (documentItem.fileId) {
                                              openFileInNewTab(documentItem.fileId, documentItem.filename);
                                            } else if (documentItem.fileUrl) {
                                              window.open(documentItem.fileUrl, '_blank', 'noopener,noreferrer');
                                            } else {
                                              alert('이 파일은 현재 볼 수 없습니다.');
                                            }
                                          }}
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          <span>보기</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </ChatBubbleMessage>
                      </div>
                    </ChatBubble>
                  ) : (
                    <div key={message.id} className="mb-6">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="text-gray-200 whitespace-pre-wrap text-sm">
                            {message.contentItems.length === 0 && message.isStreaming && (
                              <div className="flex items-center justify-center py-3">
                                <MessageLoading />
                              </div>
                            )}
                            {message.contentItems.map((item, index) => 
                              renderContentItem(item, index, !!message.isStreaming, message.id)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ChatMessageList>
              {/* 스크롤 위치 참조를 위한 빈 div */}
              <div ref={messagesEndRef} />
            </div>
            
            {/* 하단으로 스크롤 버튼 스타일 개선 */}
            {showScrollButton && (
              <button
                onClick={() => scrollToBottom()}
                className="fixed bottom-24 right-8 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-xl transition-all duration-200 z-10 flex items-center justify-center transform hover:scale-110"
                aria-label="하단으로 스크롤"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* 입력창 영역 - PlaceholdersAndVanishInput 사용 */}
          <div className="p-4 border-t border-gray-800">
            <div className="max-w-3xl mx-auto w-full">
              {/* 첨부 파일 미리보기 영역 */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
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
              
              <div className="relative">
                <PlaceholdersAndVanishInput
                  placeholders={[
                    // "자세한 정보가 필요하신가요?",
                    // "코드에 대해 질문해보세요",
                    // "이미지를 생성해볼까요?", 
                    // "파일을 첨부하여 분석해보세요",
                    // "웹 검색을 통해 정보를 찾아볼까요?",
                    // "어떻게 도와드릴까요?"
                  ]}
                  value={input}
                  onChange={handleInputChange}
                  onSubmit={handleFormSubmit}
                  submitDisabled={isStreaming}
                  rightElement={
                    <button
                      type="button"
                      onClick={handleAttachButtonClick}
                      disabled={isStreaming}
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 확대 보기 모달 */}
      {zoomedImage.isOpen && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setZoomedImage(prev => ({ ...prev, isOpen: false }))}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto p-4">
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button 
                className="bg-gray-800/80 p-2 rounded-full text-white hover:bg-gray-700 transition-colors shadow-lg backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation(); // 버블링 방지
                  // 파일 이름 생성 (현재 시간 기반)
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const fileExtension = zoomedImage.mimeType.split('/')[1] || 'png';
                  const fileName = `ai-generated-image-${timestamp}.${fileExtension}`;
                  
                  // 다운로드 링크 생성
                  const link = document.createElement('a');
                  link.href = `data:${zoomedImage.mimeType};base64,${zoomedImage.imageData}`;
                  link.download = fileName;
                  
                  // 링크 클릭해서 다운로드 시작
                  document.body.appendChild(link);
                  link.click();
                  
                  // 링크 제거
                  document.body.removeChild(link);
                }}
                title="이미지 다운로드"
              >
                <Download className="h-5 w-5" />
              </button>
              <button 
                className="bg-gray-800/80 p-2 rounded-full text-white hover:bg-red-800 transition-colors shadow-lg backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation(); // 버블링 방지
                  setZoomedImage(prev => ({ ...prev, isOpen: false }));
                }}
              >
                <span className="sr-only">닫기</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
            <img 
              src={`data:${zoomedImage.mimeType};base64,${zoomedImage.imageData}`}
              alt="확대된 이미지"
              className="max-w-full max-h-[80vh] object-contain mx-auto shadow-2xl rounded-md"
            />
          </div>
        </div>
      )}
    </>
  );
} 