import { useState, useEffect } from 'react';
import { getUserModel } from '@/app/actions/models/user-model';

export function useModelManager(agentName: string) {
  const [selectedModel, setSelectedModel] = useState(
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
  );
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [needReinit, setNeedReinit] = useState(false);

  useEffect(() => {
    const fetchUserModel = async () => {
      const { modelId } = await getUserModel(agentName);
      setSelectedModel(modelId);
    };

    fetchUserModel().catch(console.error);
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

      try {
        const response = await fetch('/api/chat/reinit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model_id: tempSelectedModel }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log(
              '에이전트 재초기화 성공:',
              data.model_id,
              `(Max Tokens: ${data.max_tokens})`
            );
          } else {
            console.error('에이전트 재초기화 실패:', data.message);
          }
        } else {
          console.error('에이전트 재초기화 요청 실패');
        }
      } catch (error) {
        console.error('에이전트 재초기화 요청 오류:', error);
      }
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