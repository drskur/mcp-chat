import React from 'react';
import { Server } from 'lucide-react';

export const EmptyServerState: React.FC = () => {
  return (
    <div className="bg-gray-900/50 rounded-lg p-6 text-center">
      <Server className="h-10 w-10 text-gray-700 mx-auto mb-3" />
      <p className="text-gray-500">등록된 MCP 서버가 없습니다</p>
    </div>
  );
};