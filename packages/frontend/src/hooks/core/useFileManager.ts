import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FileAttachment } from '@/types/file-attachment';

interface UseFileManagerOptions {
  dbName?: string;
  dbVersion?: number;
  storeName?: string;
  autoSaveToIndexedDB?: boolean;
}

interface FileManagerState {
  attachments: FileAttachment[];
  dbReady: boolean;
  isLoading: boolean;
}

const DEFAULT_OPTIONS: Required<UseFileManagerOptions> = {
  dbName: 'ChatFilesDB',
  dbVersion: 1,
  storeName: 'files',
  autoSaveToIndexedDB: true,
};

export function useFileManager(options: UseFileManagerOptions = {}) {
  const { dbName, dbVersion, storeName, autoSaveToIndexedDB } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const [state, setState] = useState<FileManagerState>({
    attachments: [],
    dbReady: false,
    isLoading: false,
  });

  const dbRef = useRef<IDBDatabase | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IndexedDB 초기화
  useEffect(() => {
    if (!autoSaveToIndexedDB) {
      setState((prev) => ({ ...prev, dbReady: true }));
      return;
    }

    const initDb = async () => {
      try {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          dbRef.current = (event.target as IDBOpenDBRequest).result;
          setState((prev) => ({ ...prev, dbReady: true }));
        };

        request.onerror = () => {
          setState((prev) => ({ ...prev, dbReady: true }));
        };
      } catch {
        setState((prev) => ({ ...prev, dbReady: true }));
      }
    };

    initDb();

    return () => {
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
    };
  }, [dbName, dbVersion, storeName, autoSaveToIndexedDB]);

  // 파일을 ArrayBuffer로 읽는 헬퍼 함수
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result instanceof ArrayBuffer ? reader.result : null);
      };

      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    });
  };

  // 파일을 Data URL로 읽는 헬퍼 함수
  const readFileAsDataURL = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };

      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // 파일 저장 함수
  const saveFileToIndexedDB = async (
    file: File,
    fileId: string,
  ): Promise<boolean> => {
    if (!dbRef.current || !state.dbReady || !autoSaveToIndexedDB) {
      return false;
    }

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      if (!arrayBuffer) return false;

      const fileData = {
        id: fileId,
        name: file.name,
        type: file.type,
        data: arrayBuffer,
        size: file.size,
        timestamp: Date.now(),
      };

      const transaction = dbRef.current.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      return new Promise((resolve) => {
        const request = store.add(fileData);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
        transaction.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  };

  // 파일 가져오기 함수
  const getFileFromIndexedDB = async (fileId: string): Promise<Blob | null> => {
    if (!dbRef.current || !state.dbReady || !autoSaveToIndexedDB) {
      return null;
    }

    try {
      const transaction = dbRef.current.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      return new Promise((resolve) => {
        const request = store.get(fileId);

        request.onsuccess = () => {
          if (request.result) {
            const fileData = request.result;
            const blob = new Blob([fileData.data], { type: fileData.type });
            resolve(blob);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  };

  // 파일 열기 함수
  const openFileInNewTab = async (fileId: string, fileName: string) => {
    try {
      const fileBlob = await getFileFromIndexedDB(fileId);

      if (fileBlob) {
        const blobUrl = URL.createObjectURL(fileBlob);
        window.open(blobUrl, '_blank');

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      } else {
        console.error(`파일을 찾을 수 없습니다: ${fileName}`);
      }
    } catch (error) {
      console.error('파일을 열 수 없습니다:', error);
    }
  };

  // 파일 다운로드 함수
  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const fileBlob = await getFileFromIndexedDB(fileId);

      if (fileBlob) {
        const blobUrl = URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 100);
      }
    } catch (error) {
      console.error('파일 다운로드 실패:', error);
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const files = Array.from(e.target.files);
      const newAttachments: FileAttachment[] = [];

      for (const file of files) {
        const fileId = uuidv4();
        const attachmentId = uuidv4();

        // IndexedDB에 저장 시도
        if (autoSaveToIndexedDB && state.dbReady) {
          await saveFileToIndexedDB(file, fileId);
        }

        // 이미지 파일인 경우 미리보기 URL 생성
        let previewUrl: string | null = null;
        if (file.type.startsWith('image/')) {
          previewUrl = await readFileAsDataURL(file);
        }

        const newAttachment: FileAttachment = {
          id: attachmentId,
          file: file,
          type: file.type,
          previewUrl: previewUrl ?? undefined,
          fileId: fileId,
        };

        newAttachments.push(newAttachment);
      }

      setState((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments],
        isLoading: false,
      }));
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 첨부 파일 제거 핸들러
  const removeAttachment = (id: string) => {
    setState((prev) => {
      const updated = prev.attachments.filter((file) => file.id !== id);

      const fileToRemove = prev.attachments.find((file) => file.id === id);
      if (
        fileToRemove?.previewUrl &&
        fileToRemove.previewUrl.startsWith('blob:')
      ) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }

      return { ...prev, attachments: updated };
    });
  };

  // 파일 첨부 버튼 클릭 핸들러
  const handleAttachButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 첨부 파일 목록 초기화
  const clearAttachments = () => {
    // blob URL 정리
    state.attachments.forEach((attachment) => {
      if (attachment.previewUrl && attachment.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });

    setState((prev) => ({ ...prev, attachments: [] }));
  };

  // 파일 배열을 data URL로 변환하여 채팅용으로 준비
  const prepareFilesForChat = async (
    files: FileAttachment[],
  ): Promise<FileAttachment[]> => {
    const preparedFiles: FileAttachment[] = [];

    for (const attachment of files) {
      if (attachment.type.startsWith('image/')) {
        let dataUrl = attachment.previewUrl;

        // blob URL이거나 data URL이 없는 경우 새로 생성
        if (!dataUrl || dataUrl.startsWith('blob:')) {
          dataUrl = (await readFileAsDataURL(attachment.file)) ?? undefined;
        }

        preparedFiles.push({
          ...attachment,
          previewUrl: dataUrl || undefined,
        });
      } else {
        preparedFiles.push(attachment);
      }
    }

    return preparedFiles;
  };

  // 첨부 파일 설정 (외부에서 직접 설정할 때 사용)
  const setAttachments = (
    attachments:
      | FileAttachment[]
      | ((prev: FileAttachment[]) => FileAttachment[]),
  ) => {
    setState((prev) => ({
      ...prev,
      attachments:
        typeof attachments === 'function'
          ? attachments(prev.attachments)
          : attachments,
    }));
  };

  return {
    // State
    attachments: state.attachments,
    dbReady: state.dbReady,
    isLoading: state.isLoading,

    // Refs
    fileInputRef,

    // Actions
    setAttachments,
    handleFileUpload,
    removeAttachment,
    handleAttachButtonClick,
    clearAttachments,
    prepareFilesForChat,

    // File operations
    saveFileToIndexedDB,
    getFileFromIndexedDB,
    openFileInNewTab,
    downloadFile,

    // Utilities
    readFileAsArrayBuffer,
    readFileAsDataURL,
  };
}
