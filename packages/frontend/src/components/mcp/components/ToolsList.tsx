import React, { useState } from 'react';
import { Search, Zap } from 'lucide-react';
import { MCPTool } from '../types';

interface ToolsListProps {
  tools: MCPTool[];
  serverName: string;
}

export const ToolsList: React.FC<ToolsListProps> = ({ tools, serverName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTools = searchTerm.trim()
    ? tools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tools;
    
  // 도구 이름에서 서버 접두사 제거 (serverName: 형식)
  const getDisplayName = (name: string) => {
    if (name.startsWith(`${serverName}:`)) {
      return name.substring(serverName.length + 1);
    }
    return name;
  };
  
  return (
    <div className="space-y-3">
      {tools.length > 6 && (
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-500" />
          </div>
          <input
            type="search"
            className="block w-full p-2 pl-10 text-sm bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-300"
            placeholder="도구 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}
      
      {filteredTools.length === 0 ? (
        <p className="text-gray-500 text-center py-2">검색 결과가 없습니다</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {filteredTools.map((tool, toolIdx) => (
            <li key={toolIdx} className="bg-black/20 p-3 rounded-md flex items-start gap-3 hover:bg-gray-800/20 transition-colors border border-transparent hover:border-gray-700">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                tool.status === 'ready' 
                  ? 'bg-emerald-900/20 text-emerald-400' 
                  : tool.status === 'error' 
                    ? 'bg-red-900/20 text-red-400'
                    : 'bg-gray-800/30 text-gray-400'
              }`}>
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 font-medium flex items-center">
                  {getDisplayName(tool.name)}
                  {tool.status === 'ready' && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </p>
                {tool.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                    {tool.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};