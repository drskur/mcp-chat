import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Image as LucideImage } from 'lucide-react';
import { availableModels } from '@/lib/model-info';
import { ModelsConfig } from '@/lib/model-info';
import { saveUserModel } from '@/app/actions/models/user-model';

interface ModelSelectorProps {
  selectedModel: string;
  onChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onChange,
}) => {
  const [modelsConfig, setModelsConfig] = useState<ModelsConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState<boolean>(false);

  // 모델 선택 처리 함수
  const handleModelChange = useCallback(async (modelId: string) => {
    // 상위 컴포넌트에 변경 알림
    onChange(modelId);

    // 선택한 모델 자동 저장
    try {
      setSavingModel(true);

      const result = await saveUserModel(modelId);
      
      if (result.success) {
        console.log('모델 자동 저장 성공:', modelId);
      } else {
        console.error('모델 자동 저장 실패');
      }
    } catch (error) {
      console.error('모델 자동 저장 오류:', error);
    } finally {
      setSavingModel(false);
    }
  }, [onChange]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);

        const config = availableModels('us-east-1'); // 기본 리전

        setModelsConfig(config);
        setError(null);

        // 기본 모델이 없으면 첫 번째 모델로 설정
        if (!selectedModel && config) {
          const firstProvider = Object.values(config.providers)[0];
          const firstModel = Object.values(firstProvider.models)[0];
          if (firstModel) {
            await handleModelChange(firstModel.id);
          }
        }
      } catch (err) {
        console.error('모델 정보를 가져오는데 실패했습니다:', err);
        setError(
          '모델 정보를 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchModels().catch(console.error);
  }, [handleModelChange, selectedModel]);

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse text-indigo-400 font-semibold text-lg">
        모델 정보를 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg shadow-lg animate-fade-in">
        {error}
      </div>
    );
  }

  if (!modelsConfig) {
    return null;
  }

  return (
    <div className="space-y-6">
      {Object.values(modelsConfig.providers).map((provider, idx) => (
        <div
          key={provider.id}
          className="space-y-2 fade-in"
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <div className="flex items-center gap-2 mb-2 px-1">
            {provider.icon && (
              <div className="bg-white rounded-md p-1 flex items-center justify-center shadow-md">
                <Image
                  src={provider.icon}
                  alt={provider.name}
                  width={24}
                  height={24}
                  className="object-contain"
                  style={{ opacity: 1, filter: 'none' }}
                />
              </div>
            )}
            <h3 className="text-base font-semibold text-gray-200 tracking-wide gradient-text drop-shadow">
              {provider.name}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.values(provider.models).map((model, mIdx) => (
              <div
                key={model.id}
                className={`relative group p-4 border rounded-2xl cursor-pointer transition-all duration-200 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-md shadow-lg overflow-hidden
                  ${
                    selectedModel === model.id
                      ? 'border-indigo-500 ring-2 ring-indigo-400/40 scale-[1.03] shadow-indigo-700/30 z-10'
                      : 'border-gray-700 hover:border-indigo-400 hover:scale-105 hover:shadow-xl'
                  }
                animate-fade-in`}
                style={{ animationDelay: `${mIdx * 60}ms` }}
                onClick={() => handleModelChange(model.id)}
              >
                {/* 선택 효과 그라데이션 테두리 */}
                {selectedModel === model.id && (
                  <div className="absolute -inset-1 rounded-2xl pointer-events-none bg-gradient-to-r from-indigo-500/60 via-purple-500/40 to-indigo-400/60 blur-[2px] opacity-60 animate-pulse z-0" />
                )}
                <div className="relative z-10 flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    id={`model-${model.id}`}
                    name="model"
                    checked={selectedModel === model.id}
                    onChange={() => handleModelChange(model.id)}
                    className="w-4 h-4 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 focus:outline-none"
                    tabIndex={-1}
                  />
                  <label
                    htmlFor={`model-${model.id}`}
                    className={`font-semibold cursor-pointer text-base truncate max-w-[160px] transition-colors
                      ${
                        selectedModel === model.id
                          ? 'text-indigo-400 drop-shadow'
                          : 'text-gray-200 group-hover:text-indigo-300'
                      }
                    `}
                  >
                    {model.name}
                  </label>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 font-mono shadow-sm">
                    {model.max_output_tokens.toLocaleString()}T
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {model.capabilities.includes('text') && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-md flex items-center gap-1 font-medium transition-all
                      ${
                        selectedModel === model.id
                          ? 'bg-indigo-700/30 text-indigo-200 shadow-md'
                          : 'bg-indigo-900/20 text-indigo-300'
                      }
                    `}
                    >
                      <span className="rounded-full bg-indigo-600 p-0.5 flex items-center justify-center">
                        <LucideImage className="h-3 w-3 text-white" />
                      </span>
                      텍스트
                    </span>
                  )}
                  {model.capabilities.includes('image') && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-md flex items-center gap-1 font-medium transition-all
                      ${
                        selectedModel === model.id
                          ? 'bg-purple-700/30 text-purple-200 shadow-md'
                          : 'bg-purple-900/20 text-purple-300'
                      }
                    `}
                    >
                      <span className="rounded-full bg-purple-600 p-0.5 flex items-center justify-center">
                        <LucideImage className="h-3 w-3 text-white" />
                      </span>
                      이미지
                    </span>
                  )}
                  {model.capabilities.includes('code') && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-md flex items-center gap-1 font-medium transition-all
                      ${
                        selectedModel === model.id
                          ? 'bg-green-700/30 text-green-200 shadow-md'
                          : 'bg-green-900/20 text-green-300'
                      }
                    `}
                    >
                      <span className="rounded-full bg-green-600 p-0.5 flex items-center justify-center">
                        <LucideImage className="h-3 w-3 text-white" />
                      </span>
                      코드
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="p-4 border border-gray-700 bg-gradient-to-r from-gray-800/70 to-gray-900/70 rounded-xl flex items-center gap-3 shadow-inner animate-fade-in">
        <span className="rounded-full bg-indigo-600 p-1 flex items-center justify-center shadow-md">
          <LucideImage className="w-5 h-5 text-white flex-shrink-0 animate-pulse" />
        </span>
        <p className="text-sm text-indigo-200">
          모델을 변경하면 새로운 대화가 시작됩니다. AWS Bedrock API를 통해
          호출됩니다.
          {savingModel && (
            <span className="ml-1 text-xs text-indigo-400 animate-pulse">
              (저장 중...)
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ModelSelector;
