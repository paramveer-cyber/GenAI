import { OpenAIEmbeddings } from "@langchain/openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export function buildEmbeddingsClient(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
  });
}
