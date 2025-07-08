/// <reference types="@solidjs/start/env" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: "development" | "production" | "test";
      readonly AWS_REGION: string;
      readonly BEDROCK_MODEL: string;
      readonly DOMAIN_NAME: string;
    }
  }
}

export {};
