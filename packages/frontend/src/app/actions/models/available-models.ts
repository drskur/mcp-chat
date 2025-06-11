import { availableModels, ProviderInfo } from '@/lib/models/model-info';
import { env } from '@/lib/config/env';

export function getAvailableModels(): ProviderInfo[] {
  const { providers } = availableModels(env.AWS_REGION);
  return [providers.amazon, providers.anthropic];
}
