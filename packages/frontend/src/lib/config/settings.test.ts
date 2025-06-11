import { describe, it, expect } from 'vitest';
import { setValueByPath } from './settings';

describe('setValueByPath', () => {
  it('단순 경로에 값을 저장해야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    };

    const result = setValueByPath(existingSettings, 'theme', 'dark');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      theme: 'dark',
    });
  });

  it('중첩된 경로에 값을 저장해야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    };

    const result = setValueByPath(existingSettings, 'aws.region', 'us-east-1');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      aws: { region: 'us-east-1' },
    });
  });

  it('기존 중첩 객체를 유지하면서 값을 추가해야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      aws: {
        region: 'us-west-2',
        profile: 'default',
      },
    };

    const result = setValueByPath(existingSettings, 'aws.endpoint', 'https://api.aws.com');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      aws: {
        region: 'us-west-2',
        profile: 'default',
        endpoint: 'https://api.aws.com',
      },
    });
  });

  it('깊은 중첩 경로를 처리해야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    };

    const result = setValueByPath(existingSettings, 'api.endpoints.production.url', 'https://api.prod.com');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      api: {
        endpoints: {
          production: {
            url: 'https://api.prod.com',
          },
        },
      },
    });
  });

  it('배열 값을 저장할 수 있어야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    };

    const result = setValueByPath(existingSettings, 'allowedModels', ['model1', 'model2', 'model3']);

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      allowedModels: ['model1', 'model2', 'model3'],
    });
  });

  it('객체 값을 저장할 수 있어야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    };

    const userPreferences = {
      theme: 'dark',
      language: 'ko',
      notifications: true,
    };

    const result = setValueByPath(existingSettings, 'user.preferences', userPreferences);

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      user: {
        preferences: userPreferences,
      },
    });
  });

  it('null 값을 저장할 수 있어야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      apiKey: 'some-key',
    };

    const result = setValueByPath(existingSettings, 'apiKey', null);

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      apiKey: null,
    });
  });

  it('빈 경로를 처리해야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    };

    const result = setValueByPath(existingSettings, '', 'value');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      '': 'value',
    });
  });

  it('기존 값을 덮어써야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      theme: 'light',
    };

    const result = setValueByPath(existingSettings, 'theme', 'dark');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      theme: 'dark',
    });
  });

  it('깊은 중첩 경로에서 기존 값을 덮어써야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      api: {
        endpoints: {
          production: {
            url: 'https://old.api.com',
            timeout: 5000,
          },
          staging: {
            url: 'https://staging.api.com',
          },
        },
      },
    };

    const result = setValueByPath(existingSettings, 'api.endpoints.production.url', 'https://new.api.com');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      api: {
        endpoints: {
          production: {
            url: 'https://new.api.com',
            timeout: 5000,
          },
          staging: {
            url: 'https://staging.api.com',
          },
        },
      },
    });
  });

  it('중첩 경로에서 배열을 포함한 객체를 처리해야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      features: {
        enabled: ['feature1', 'feature2'],
        beta: {
          users: ['user1', 'user2'],
        },
      },
    };

    const result = setValueByPath(existingSettings, 'features.beta.enabled', true);

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      features: {
        enabled: ['feature1', 'feature2'],
        beta: {
          users: ['user1', 'user2'],
          enabled: true,
        },
      },
    });
  });

  it('점이 포함된 키를 처리해야 한다', () => {
    const existingSettings = {
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    };

    const result = setValueByPath(existingSettings, '1.2.3', 'version');

    expect(result).toEqual({
      defaultModelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      '1': {
        '2': {
          '3': 'version',
        },
      },
    });
  });
});