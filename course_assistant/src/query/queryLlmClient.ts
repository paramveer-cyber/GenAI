import OpenAI from "openai";

function getModelFromEnv(envVarName: string): string {
  const model = process.env[envVarName];
  if (!model) throw new Error(`${envVarName} is not set in .env`);
  return model;
}

export function getPrimaryModel(): string {
  return getModelFromEnv("PRIMARY_MODEL");
}

export function getSecondaryModel(): string {
  return getModelFromEnv("SECONDARY_MODEL");
}

export function buildQueryLlmClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
