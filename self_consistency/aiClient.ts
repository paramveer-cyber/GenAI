import type { OpenAI } from "openai";

interface aiProps {
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
}

export const apiChecker = ({ OPENAI_API_KEY, OPENAI_BASE_URL }: aiProps) => {
  if (!OPENAI_API_KEY || !OPENAI_BASE_URL) {
    throw new Error("Configure environment variables properly!");
  }
};

export const openAIClient = async ({
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
}: aiProps): Promise<OpenAI> => {
  apiChecker({ OPENAI_API_KEY, OPENAI_BASE_URL });
  const { OpenAI } = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL,
  });
  return client;
};

export const initializeModels = async () => {
  const gpt = await openAIClient({
    OPENAI_API_KEY: process.env.OPENAI_KEY!,
    OPENAI_BASE_URL: process.env.OPENAI_URL!,
  });
  console.log("[INITIALISE]: GPT Model initialised");
  const gemini = await openAIClient({
    OPENAI_API_KEY: process.env.GEMINI_KEY!,
    OPENAI_BASE_URL: process.env.GEMINI_URL!,
  });
  console.log("[INITIALISE]: Gemini Model initialised");
  const openRouter = await openAIClient({
    OPENAI_API_KEY: process.env.OPENROUTER_KEY!,
    OPENAI_BASE_URL: process.env.OPENROUTER_URL!,
  });
  console.log("[INITIALISE]: OpenRouter Model initialised");

  return {
    gpt,
    gemini,
    openRouter,
  };
};
