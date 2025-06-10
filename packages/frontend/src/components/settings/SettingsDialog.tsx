'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import MCPToolManager from '@/components/dialog/MCPToolManager';
import SystemPromptEditor from '@/components/dialog/SystemPromptEditor';
import ModelSelector from '@/components/dialog/ModelSelector';
import UserSettings from '@/components/dialog/UserSettings';
import { Button } from '@/components/ui/button';

type SettingsType = 'tools' | 'prompt' | 'model' | 'user';

interface SettingsDialogProps {
  activeSettings: SettingsType | null;
  onOpenChange: (open: boolean) => void;
  needReinit: boolean;
  selectedModel: string;
  tempSelectedModel: string;
  onModelChange: (modelId: string) => void;
  onSettingsChanged: () => void;
  onApplySettings: () => void;
  onUserSettingsChanged: () => void;
}

const getDialogConfig = (activeSettings: SettingsType | null) => {
  switch (activeSettings) {
    case 'tools':
      return {
        title: 'MCP 도구 관리',
        description: 'AI 어시스턴트가 사용할 MCP 도구를 관리합니다.'
      };
    case 'prompt':
      return {
        title: '시스템 프롬프트 설정',
        description: 'AI 어시스턴트에게 지시할 시스템 프롬프트를 설정합니다.'
      };
    case 'model':
      return {
        title: 'AI 모델 선택',
        description: '사용할 AI 모델을 선택합니다.'
      };
    case 'user':
      return {
        title: '사용자 인터페이스 설정',
        description: '시스템 제목과 로고를 사용자 정의합니다.'
      };
    default:
      return {
        title: '설정',
        description: '설정을 변경합니다.'
      };
  }
};

export const SettingsDialog = ({
  activeSettings,
  onOpenChange,
  needReinit,
  selectedModel,
  tempSelectedModel,
  onModelChange,
  onSettingsChanged,
  onApplySettings,
  onUserSettingsChanged
}: SettingsDialogProps) => {
  const dialogConfig = getDialogConfig(activeSettings);

  return (
    <Dialog 
      open={activeSettings !== null} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-900 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-1">
              <DialogTitle asChild>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400">
                  {dialogConfig.title}
                </h2>
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-sm text-gray-400">{dialogConfig.description}</p>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          {activeSettings === 'tools' && (
            <MCPToolManager onSettingsChanged={onSettingsChanged} />
          )}
          {activeSettings === 'prompt' && (
            <SystemPromptEditor onSettingsChanged={onSettingsChanged} />
          )}
          {activeSettings === 'model' && (
            <ModelSelector
              selectedModel={tempSelectedModel || selectedModel}
              onChange={onModelChange}
            />
          )}
          {activeSettings === 'user' && (
            <UserSettings onSettingsChanged={onUserSettingsChanged} />
          )}
        </div>
        
        {needReinit && activeSettings !== 'user' && activeSettings !== 'prompt' && activeSettings !== 'tools' && (
          <DialogFooter>
            <Button onClick={onApplySettings} className="w-full gradient-button">
              설정 적용 & 에이전트 재시작
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};