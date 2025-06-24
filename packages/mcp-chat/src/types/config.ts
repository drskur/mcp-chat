export const Theme = {
    LIGHT: "light",
    DARK: "dark",
} as const;

export type Theme = typeof Theme[keyof typeof Theme];

export interface BedrockModel {
    modelId: string;
    name: string;
}

export const AnthropicModel: Record<string, BedrockModel> = {
    CLAUDE_3_5_HAIKU: {
        modelId: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        name: "Claude 3.5 Haiku"
    },
    CLAUDE_3_7_SONNET: {
        modelId: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        name: "Claude 3.7 Sonnet"
    },
    CLAUDE_4_OPUS: {
        modelId: "us.anthropic.claude-opus-4-20250514-v1:0",
        name: "Claude 4 Opus"
    },
    CLAUDE_4_SONNET: {
        modelId: "us.anthropic.claude-sonnet-4-20250514-v1:0",
        name: "Claude 4 Sonnet"
    },
}

export type AnthropicModel = typeof AnthropicModel[keyof typeof AnthropicModel];