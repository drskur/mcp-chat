import React from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { MCPServer, ServerConfig } from '../types';
import { ServerStatusIcon } from '@/components/mcp';
import { ToolsList } from './ToolsList';

interface ServerCardProps {
  server: MCPServer;
  serverIdx: number;
  onToggleExpanded: (index: number) => void;
  onEdit: (serverName: string, serverConfig: ServerConfig) => void;
  onDelete: (serverName: string) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  serverIdx,
  onToggleExpanded,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-gray-900/30 rounded-lg border border-gray-800 overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <ServerStatusIcon status={server.status || 'unknown'} />

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-200 flex items-center gap-2">
            {server.name}
            {server.status === 'online' && (
              <span className="text-xs px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-full">온라인</span>
            )}
            {server.status === 'offline' && (
              <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded-full">오프라인</span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {server.tools && server.tools.length > 0 ? (
              `${server.tools.length}개 도구 제공 중`
            ) : (
              '도구 없음'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
            onClick={() => onToggleExpanded(serverIdx)}
            title={server.expanded ? '접기' : '펼치기'}
          >
            {server.expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>

          <button
            className="p-2 text-gray-500 hover:text-indigo-400 rounded-lg hover:bg-gray-800"
            onClick={() => onEdit(server.name, server.config)}
            title="서버 수정"
          >
            <Edit className="h-5 w-5" />
          </button>

          <button
            className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800"
            onClick={() => onDelete(server.name)}
            title="서버 삭제"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {server.expanded && (
        <div className="border-t border-gray-800 p-4 bg-black/30">
          {server.tools && server.tools.length > 0 ? (
            <ToolsList tools={server.tools} serverName={server.name} />
          ) : (
            <p className="text-gray-500 text-center py-4">이 서버에서 제공하는 도구가 없습니다</p>
          )}
        </div>
      )}
    </div>
  );
};