import React from 'react';
import { Plug } from 'lucide-react';

interface ServerStatusIconProps {
  status: 'online' | 'offline' | 'unknown';
}

export const ServerStatusIcon: React.FC<ServerStatusIconProps> = ({ status }) => {
  let bgColor = 'bg-gray-800/50';
  let textColor = 'text-gray-400';
  
  if (status === 'online') {
    bgColor = 'bg-emerald-900/30';
    textColor = 'text-emerald-400';
  } else if (status === 'offline') {
    bgColor = 'bg-red-900/30';
    textColor = 'text-red-400';
  }
  
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor} ${textColor} relative`}>
      <Plug className="h-5 w-5" />
      {status === 'online' && (
        <span className="absolute w-full h-full rounded-lg bg-emerald-400/20 animate-ping" />
      )}
    </div>
  );
};