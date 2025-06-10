'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FileAttachment } from '@/types/file-attachment';

export const useFileAttachment = () => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [dbReady, setDbReady] = useState<boolean>(false);
  const dbRef = useRef<IDBDatabase | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IndexedDB 초기화
  useEffect(() => {
    const initDb = async () => {
      try {
        const request = indexedDB.open('ChatFilesDB', 1);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains('files')) {
            db.createObjectStore('files', { keyPath: 'id' });
          }
        };
        
        request.onsuccess = (event) => {
          dbRef.current = (event.target as IDBOpenDBRequest).result;
          setDbReady(true);
        };
        
        request.onerror = () => {
          // IndexedDB 연결 실패 시 무시
        };
      } catch {
        // IndexedDB 초기화 오류 시 무시
      }
    };
    
    initDb();
    
    return () => {
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
    };
  }, []);

  // 파일을 ArrayBuffer로 읽는 헬퍼 함수
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          resolve(null);
        }
      };
      
      reader.onerror = () => {
        resolve(null);
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // 파일 저장 함수
  const saveFileToIndexedDB = async (file: File, fileId: string): Promise<boolean> => {
    if (!dbRef.current || !dbReady) {
      return false;
    }
    
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      if (!arrayBuffer) {
        return false;
      }
      
      const fileData = {
        id: fileId,
        name: file.name,
        type: file.type,
        data: arrayBuffer,
        size: file.size,
        timestamp: Date.now()
      };
      
      const transaction = dbRef.current.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      return new Promise((resolve) => {
        const request = store.add(fileData);
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = () => {
          resolve(false);
        };
        
        transaction.oncomplete = () => {
          // 트랜잭션 완료
        };
        
        transaction.onerror = () => {
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  };

  // 파일 가져오기 함수
  const getFileFromIndexedDB = async (fileId: string): Promise<Blob | null> => {
    if (!dbRef.current || !dbReady) {
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
            resolve(null);
          }
        };
        
        request.onerror = () => {
          resolve(null);
        };
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
        alert(`파일을 찾을 수 없습니다: ${fileName}`);
      }
    } catch {
      alert('파일을 열 수 없습니다.');
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      const fileId = uuidv4();
      
      if (dbReady) {
        try {
          await saveFileToIndexedDB(file, fileId);
        } catch {
          // 파일 저장 실패 시 무시
        }
      }
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = () => {
          const result = reader.result as string;
          
          const newAttachment: FileAttachment = {
            id: uuidv4(),
            file: file,
            type: file.type,
            previewUrl: result,
            fileId: fileId
          };
          
          setAttachments(prev => [...prev, newAttachment]);
        };
        
        reader.onerror = () => {
          // FileReader 오류 시 무시
        };
        
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, {
          id: uuidv4(),
          file: file,
          type: file.type,
          fileId: fileId
        }]);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 첨부 파일 제거 핸들러
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const updated = prev.filter(file => file.id !== id);
      
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

  // 첨부 파일 목록 초기화
  const clearAttachments = () => {
    setAttachments([]);
  };

  return {
    attachments,
    setAttachments,
    dbReady,
    fileInputRef,
    saveFileToIndexedDB,
    getFileFromIndexedDB,
    openFileInNewTab,
    handleFileUpload,
    removeAttachment,
    handleAttachButtonClick,
    clearAttachments
  };
};