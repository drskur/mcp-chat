import { availableModels, ModelsConfig, ProviderInfo } from '@/lib/model-info';
import { env } from '@/lib/env';

export function getAvailableModels(): ProviderInfo[] {
  const { providers } = availableModels(env.AWS_REGION);
  return [providers.amazon, providers.anthropic];
}
