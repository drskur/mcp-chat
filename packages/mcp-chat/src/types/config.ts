export const Theme = {
    LIGHT: "light",
    DARK: "dark",
} as const;

export type Theme = typeof Theme[keyof typeof Theme];

export const AnthropicModel = {
    CLAUDE_3_5_HAIKU: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    CLAUDE_3_7_SONNET: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    CLAUDE_4_OPUS: "us.anthropic.claude-opus-4-20250514-v1:0",
    CLAUDE_4_SONNET: "us.anthropic.claude-sonnet-4-20250514-v1:0",
}

export type AnthropicModel = typeof AnthropicModel[keyof typeof AnthropicModel];