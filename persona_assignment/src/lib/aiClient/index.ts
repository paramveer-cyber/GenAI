import dotenv from "dotenv";
import type { OpenAI } from "openai";

dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

export const apiChecker = () => {
  if (!OPENAI_API_KEY || !OPENAI_BASE_URL) {
    console.error("OPENAPI_KEY and OPEANAI_URL must be set in the .env file");
    process.exit(1);
  }
  console.log("API Key and URL are set correctly.");
};

export const openAIClient = async (): Promise<OpenAI> => {
  apiChecker();
  const { OpenAI } = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL,
  });
  if (!client) {
    console.error("Failed to create OpenAI client.");
    process.exit(1);
  }
  console.log("OpenAI client created successfully.");
  return client;
};
