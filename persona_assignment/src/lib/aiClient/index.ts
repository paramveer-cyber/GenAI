import type { OpenAI } from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

export const apiChecker = () => {
  if (!OPENAI_API_KEY || !OPENAI_BASE_URL) {
    throw new Error(
      "OPENAI_API_KEY and OPENAI_BASE_URL must be set in the environment",
    );
  }
};

export const openAIClient = async (): Promise<OpenAI> => {
  apiChecker();
  const { OpenAI } = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL,
  });
  return client;
};
