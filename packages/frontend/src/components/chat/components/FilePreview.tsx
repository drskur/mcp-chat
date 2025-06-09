import React from 'react';
import Image from 'next/image';
import { X, FileIcon } from "lucide-react";
import type { FileAttachment } from '../types/chat.types';

interface FilePreviewProps {
  attachments: FileAttachment[];
  onRemoveAttachment: (id: string) => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ attachments, onRemoveAttachment }) => {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {attachments.map(file => (
        <div key={file.id} className="relative group bg-gray-800 rounded-md border border-gray-700 p-2 flex items-center gap-2">
          {file.previewUrl ? (
            <div className="w-10 h-10 rounded overflow-hidden bg-gray-700 flex items-center justify-center">
              <Image 
                src={file.previewUrl} 
                alt="미리보기" 
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
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
            onClick={() => onRemoveAttachment(file.id)}
            className="absolute -top-2 -right-2 bg-gray-900 rounded-full p-1 border border-gray-700 text-gray-400 hover:text-white hover:bg-red-900 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};