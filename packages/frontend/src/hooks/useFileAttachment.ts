'use client';

import { useState, useRef } from 'react';
import { FileAttachment } from '@/types/file-attachment';

export const useFileAttachment = () => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    
    const filePromises = files.map(file => {
      return new Promise<FileAttachment>((resolve) => {
        const id = crypto.randomUUID();
        const attachment: FileAttachment = {
          id,
          file,
          type: file.type,
        };
        
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            attachment.previewUrl = result;
            resolve(attachment);
          };
          reader.onerror = () => {
            console.error('파일 읽기 오류:', file.name);
            resolve(attachment);
          };
          reader.readAsDataURL(file);
        } else {
          resolve(attachment);
        }
      });
    });
    
    Promise.all(filePromises).then(newAttachments => {
      setAttachments(prev => [...prev, ...newAttachments]);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const updated = prev.filter(file => file.id !== id);
      
      const fileToRemove = prev.find(file => file.id === id);
      if (fileToRemove?.previewUrl && fileToRemove.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      
      return updated;
    });
  };
  
  const clearAttachments = () => {
    setAttachments([]);
  };
  
  const handleAttachButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return {
    attachments,
    fileInputRef,
    handleFileUpload,
    removeAttachment,
    clearAttachments,
    handleAttachButtonClick,
    setAttachments
  };
};