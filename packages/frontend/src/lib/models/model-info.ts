const MODELS_CONFIG = {
  providers: {
    amazon: {
      id: 'amazon',
      name: 'Amazon',
      icon: 'amazon.svg',
      models: {
        'nova-premier': {
          id: 'amazon.nova-premier-v1:0',
          name: 'Nova Premier',
          capabilities: ['text', 'image'],
          max_output_tokens: 32000,
        },
        'nova-pro': {
          id: 'amazon.nova-pro-v1:0',
          name: 'Nova Pro',
          capabilities: ['text', 'image'],
          max_output_tokens: 16000,
        },
      },
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic',
      icon: 'anthropic.svg',
      models: {
        'claude-3.7-sonnet': {
          id: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
          name: 'Claude 3.7 Sonnet',
          capabilities: ['text', 'image'],
          max_output_tokens: 128000,
        },
        'claude-4-sonnet': {
          id: 'anthropic.claude-sonnet-4-20250514-v1:0',
          name: 'Claude 4 Sonnet',
          capabilities: ['text', 'image'],
          max_output_tokens: 64000,
        },
        'claude-4-opus': {
          id: 'anthropic.claude-opus-4-20250514-v1:0',
          name: 'Claude 4 Opus',
          capabilities: ['text', 'image'],
          max_output_tokens: 64000,
        },
        'claude-3.5-haiku': {
          id: 'anthropic.claude-3-5-haiku-20241022-v1:0',
          name: 'Claude 3.5 Haiku',
          capabilities: ['text'],
          max_output_tokens: 8192,
        },
      },
    },
  },
} as const;

export type ModelCapability = 'text' | 'image' | 'code';
export type CrossRegion = 'us' | 'apac' | 'eu';

export interface ModelInfo {
  id: string;
  name: string;
  capabilities: ModelCapability[];
  max_output_tokens: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  models: Record<string, ModelInfo>;
}

export interface ModelsConfig {
  providers: Record<'amazon' | 'anthropic', ProviderInfo>;
}

type RegionSupport = Record<
  CrossRegion,
  {
    amazon: string[];
    anthropic: string[];
  }
>;

// Cross inference를 위한 리전 prefix 매핑
const REGION_MAPPING: Record<string, CrossRegion> = {
  // US 리전 -> "us" prefix
  'us-east-1': 'us',
  'us-east-2': 'us',
  'us-west-1': 'us',
  'us-west-2': 'us',
  'ca-central-1': 'us',
  'sa-east-1': 'us',

  // AP 리전 -> "apac" prefix
  'ap-northeast-1': 'apac',
  'ap-northeast-2': 'apac',
  'ap-northeast-3': 'apac',
  'ap-southeast-1': 'apac',
  'ap-southeast-2': 'apac',
  'ap-south-1': 'apac',
  'ap-east-1': 'apac',

  // EU 리전 -> "eu" prefix
  'eu-central-1': 'eu',
  'eu-west-1': 'eu',
  'eu-west-2': 'eu',
  'eu-west-3': 'eu',
  'eu-north-1': 'eu',
  'eu-south-1': 'eu',
} as const;

// 리전별 지원 모델 정의
const REGION_MODEL_SUPPORT: RegionSupport = {
  us: {
    amazon: ['nova-premier', 'nova-pro'],
    anthropic: [
      'claude-3.7-sonnet',
      'claude-4-sonnet',
      'claude-4-opus',
      'claude-3.5-haiku',
    ],
  },
  apac: {
    amazon: ['nova-pro'], // nova-premier 미지원
    anthropic: ['claude-3.7-sonnet', 'claude-4-sonnet', 'claude-3.5-haiku'], // claude-4-opus 미지원
  },
  eu: {
    amazon: ['nova-pro'], // nova-premier 미지원
    anthropic: ['claude-3.7-sonnet'], // claude-3.7-sonnet만 지원
  },
} as const;

export function availableModels(region: string): ModelsConfig {
  // 입력된 리전에 대한 cross inference prefix 결정
  const crossRegionPrefix = REGION_MAPPING[region] || 'us';
  const currentRegionModels = REGION_MODEL_SUPPORT[crossRegionPrefix];

  // 지원하는 모델만 필터링
  const filteredConfig: ModelsConfig = {
    providers: {
      amazon: {
        id: MODELS_CONFIG.providers.amazon.id,
        name: MODELS_CONFIG.providers.amazon.name,
        icon: MODELS_CONFIG.providers.amazon.icon,
        models: {},
      },
      anthropic: {
        id: MODELS_CONFIG.providers.anthropic.id,
        name: MODELS_CONFIG.providers.anthropic.name,
        icon: MODELS_CONFIG.providers.anthropic.icon,
        models: {},
      },
    },
  };

  // 모델 필터링 및 ID 변환 헬퍼 함수
  const processModels = (providerKey: 'amazon' | 'anthropic') => {
    const modelsMap = new Map(Object.entries(MODELS_CONFIG.providers[providerKey].models));

    for (const [key, model] of modelsMap) {
      if (currentRegionModels[providerKey].includes(key)) {
        filteredConfig.providers[providerKey].models[key] = {
          ...model,
          id: model.id.replace(
            /^\w+\./,
            `${crossRegionPrefix}.${providerKey}.`,
          ),
          capabilities: [...model.capabilities] as ModelCapability[],
        };
      }
    }
  };

  // 각 프로바이더 모델 처리
  processModels('amazon');
  processModels('anthropic');

  return filteredConfig;
}
