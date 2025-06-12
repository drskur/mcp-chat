'use server';

import { env } from '@/lib/config/env';
import {
  availableModels,
  type ModelCapability,
  ModelsConfig,
} from '@/lib/models/model-info';
import { getCurrentModelId } from '@/lib/config/settings';

/**
 * 현재 설정된 모델의 capabilities를 가져옵니다
 */
export async function getCurrentModelCapabilities(): Promise<
  ModelCapability[]
> {
  try {
    const region = env.AWS_REGION;
    const modelId = await getCurrentModelId();

    const models = availableModels(region);
    const capabilities = findModelCapabilities(modelId, models);

    return capabilities ?? [];
  } catch (error) {
    console.error(error);
  }

  return [];
}

/**
 * 모델 ID로부터 capabilities를 찾습니다
 */
function findModelCapabilities(
  modelId: string,
  modelsConfig: ModelsConfig,
): ModelCapability[] | null {
  // modelId 형식: us.anthropic.claude-3-5-sonnet-20241022-v2:0
  // 또는: anthropic.claude-3-5-sonnet-20241022-v2:0

  for (const provider of Object.values(modelsConfig.providers)) {
    for (const [_modelKey, model] of Object.entries(
      provider.models as Record<string, any>,
    )) {
      if (model.id === modelId) {
        return model.capabilities;
      }
    }
  }

  // 정확한 매칭이 안 되면 모델명으로 매칭 시도
  const modelName = extractModelName(modelId);
  if (modelName) {
    for (const provider of Object.values(modelsConfig.providers)) {
      for (const [modelKey, model] of Object.entries(
        provider.models as Record<string, any>,
      )) {
        if (modelKey === modelName || model.id.includes(modelName)) {
          return model.capabilities;
        }
      }
    }
  }

  return null;
}

/**
 * 모델 ID에서 모델명을 추출합니다
 */
function extractModelName(modelId: string): string | null {
  // us.anthropic.claude-3-5-sonnet-20241022-v2:0 -> claude-3.5-sonnet
  // anthropic.claude-3-5-sonnet-20241022-v2:0 -> claude-3.5-sonnet

  const parts = modelId.split('.');
  if (parts.length < 3) return null;

  // anthropic 모델인 경우
  if (modelId.includes('anthropic')) {
    const modelPart = parts[parts.length - 1]; // claude-3-5-sonnet-20241022-v2:0
    const match = modelPart.match(/^(claude-[\d.]+-\w+)/);
    return match ? match[1] : null;
  }

  // amazon 모델인 경우
  if (modelId.includes('amazon')) {
    const modelPart = parts[parts.length - 1]; // nova-premier-v1:0
    const match = modelPart.match(/^(nova-\w+)/);
    return match ? match[1] : null;
  }

  return null;
}
