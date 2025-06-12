import React from 'react';
import { FileIcon } from "lucide-react";
import { getFileIconType } from '@/lib/utils/fileUtils';

/**
 * 파일 아이콘 타입에 따른 색상이 적용된 FileIcon 컴포넌트를 반환합니다
 */
export const FileIconWithColor: React.FC<{ fileType: string; className?: string }> = ({ 
  fileType, 
  className = "h-5 w-5" 
}) => {
  const iconType = getFileIconType(fileType);
  
  const colorClass = {
    'pdf': 'text-red-400',
    'doc': 'text-blue-400',
    'sheet': 'text-green-400',
    'text': 'text-gray-400',
    'image': 'text-purple-400',
    'html': 'text-orange-400',
    'code': 'text-cyan-400',
    'archive': 'text-yellow-400',
    'presentation': 'text-pink-400',
    'generic': 'text-gray-400'
  }[iconType] || 'text-gray-400';

  return <FileIcon className={`${className} ${colorClass}`} />;
};