import React from 'react';
import Image from 'next/image';
import { Download } from "lucide-react";
import type { ZoomedImageState } from '../../../types/chat.types';

interface ImageZoomProps {
  zoomedImage: ZoomedImageState;
  onClose: () => void;
}

export const ImageZoom: React.FC<ImageZoomProps> = ({ zoomedImage, onClose }) => {
  if (!zoomedImage.isOpen) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = zoomedImage.mimeType.split('/')[1] || 'png';
    const fileName = `ai-generated-image-${timestamp}.${fileExtension}`;

    const link = document.createElement('a');
    link.href = `data:${zoomedImage.mimeType};base64,${zoomedImage.imageData}`;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto p-4">
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            className="bg-gray-800/80 p-2 rounded-full text-white hover:bg-gray-700 transition-colors shadow-lg backdrop-blur-sm"
            onClick={handleDownload}
            title="이미지 다운로드"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            className="bg-gray-800/80 p-2 rounded-full text-white hover:bg-red-800 transition-colors shadow-lg backdrop-blur-sm"
            onClick={handleClose}
          >
            <span className="sr-only">닫기</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <div className="relative max-w-full max-h-[80vh] mx-auto">
          <Image
            src={`data:${zoomedImage.mimeType};base64,${zoomedImage.imageData}`}
            alt="확대된 이미지"
            width={800}
            height={600}
            className="max-w-full max-h-[80vh] object-contain mx-auto shadow-2xl rounded-md w-auto h-auto"
            unoptimized
          />
        </div>
      </div>
    </div>
  );
};