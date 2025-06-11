import { useState, useEffect } from 'react';
import { getUserModel } from '@/app/actions/models/user-model';
import {
  initializeBedrockClient,
  updateBedrockModel,
} from '@/app/actions/agent/bedrock-client';
import { initializePromptManager } from '@/app/actions/agent/prompt';

export function useModelManager(agentName: string) {
  const [selectedModel, setSelectedModel] = useState(
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  );
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [needReinit, setNeedReinit] = useState(false);

  useEffect(() => {
    const fetchUserModel = async () => {
      const { modelId } = await getUserModel(agentName);
      setSelectedModel(modelId);
    };

    fetchUserModel().catch(console.error);
    initializeBedrockClient(agentName).catch(console.error);
    initializePromptManager(agentName).catch(console.error);
  }, [agentName]);

  const handleModelChange = async (modelId: string) => {
    setTempSelectedModel(modelId);
    setNeedReinit(true);

    try {
      const { saveUserModel } = await import('@/app/actions/models/user-model');
      const result = await saveUserModel(agentName, modelId);

      if (result.success) {
        console.log('모델 자동 저장 성공:', modelId);
        setSelectedModel(modelId);

        // BedrockClient 업데이트
        const updateResult = await updateBedrockModel(modelId);
        if (!updateResult.success) {
          console.error('BedrockClient 업데이트 실패:', updateResult.error);
        }
      } else {
        console.error('모델 자동 저장 실패');
      }
    } catch (error) {
      console.error('모델 자동 저장 오류:', error);
    }
  };

  const handleApplySettings = async () => {
    if (tempSelectedModel && tempSelectedModel !== selectedModel) {
      setSelectedModel(tempSelectedModel);
      setTempSelectedModel('');

      // TODO: Reinit
    }

    setNeedReinit(false);
  };

  const resetTempModel = () => {
    setTempSelectedModel('');
  };

  const initializeTempModel = (modelId: string) => {
    setTempSelectedModel(modelId);
  };

  return {
    selectedModel,
    tempSelectedModel,
    needReinit,
    handleModelChange,
    handleApplySettings,
    resetTempModel,
    initializeTempModel,
    setNeedReinit,
  };
}
