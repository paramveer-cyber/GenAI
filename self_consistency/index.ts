import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { initializeModels } from "./aiClient.js";
import type OpenAI from "openai";

type AvailableModelNames =
  | "gpt-4o-mini"
  | "gemini-flash-lite-latest"
  | "openrouter/free"
  | "deepseek/deepseek-r1:free"
  | "qwen/qwen3-coder:free";

interface Model {
  client: OpenAI;
  model: AvailableModelNames;
}

interface Prompt {
  system_prompt: string;
  user_prompt: string;
}

const rl = createInterface({ input, output });

const SYSTEM_PROMPT = `
You are a knowledgeable and accurate assistant.

Provide concise answers without omitting important information.
Prioritize factual correctness over speculation.
If you are uncertain about something, clearly state your uncertainty instead of inventing an answer.
`;

const { gpt, gemini, openRouter } = await initializeModels();

const AVAILABLE_MODELS: Model[] = [
  { client: gpt, model: "gpt-4o-mini" },
  { client: gemini, model: "gemini-flash-lite-latest" },
  { client: openRouter, model: "openrouter/free" },
];

const queryModel = async ({
  model,
  query,
}: {
  model: Model;
  query: Prompt;
}) => {
  const response = await model.client.chat.completions.create({
    model: model.model,
    messages: [
      {
        role: "system",
        content: query.system_prompt,
      },
      {
        role: "user",
        content: query.user_prompt,
      },
    ],
    max_completion_tokens: 15_000,
  });

  return response.choices[0]?.message.content;
};

const queryAllAvailableModels = async ({
  availableModels,
  query,
}: {
  availableModels: Model[];
  query: Prompt;
}) => {
  const responses = await Promise.allSettled(
    availableModels.map((model) => queryModel({ model, query })),
  );

  const answers: string[] = [];

  console.log("\n===========================================");
  console.log("MODEL RESPONSES");
  console.log("===========================================\n");

  responses.forEach((response, index) => {
    console.log(`${index + 1}. ${availableModels[index]?.model}`);
    console.log("-------------------------------------------");

    if (response.status === "fulfilled" && response.value) {
      console.log(response.value);
      answers.push(response.value);
    } else {
      console.log("Model failed to generate a response.");
    }

    console.log();
  });

  return answers;
};

const produceRefinedAnswer = async (
  answers: string[],
  model: Model,
  userQuery: string,
) => {
  const refiningSystemPrompt = `
You are an expert evaluator responsible for producing the best possible answer from multiple independent AI responses.

Instructions:
- Carefully compare all candidate answers.
- Identify the facts and reasoning on which multiple answers agree.
- Discard unsupported, contradictory, or factually incorrect claims.
- Combine the strongest ideas into one clear, accurate, and coherent answer.
- Do not mention multiple models or a panel of experts.
- Do not include introductory phrases such as "Here is the refined answer."
- Return only the final refined answer.

Original Question:
${userQuery}

Candidate Answers:
${answers.join("\n\n------------------------------\n\n")}
`;

  return await queryModel({
    model,
    query: {
      user_prompt: userQuery,
      system_prompt: refiningSystemPrompt,
    },
  });
};

const selfConsistentlyAnswer = async (query: Prompt) => {
  const answers = await queryAllAvailableModels({
    availableModels: AVAILABLE_MODELS,
    query,
  });

  return await produceRefinedAnswer(
    answers,
    AVAILABLE_MODELS[0]!,
    query.user_prompt,
  );
};

const printMenu = () => {
  console.clear();

  console.log("===========================================");
  console.log(" Multi-Model Self-Consistency CLI");
  console.log("===========================================\n");

  console.log("1. Ask a Question");
  console.log("2. Show Available Models");
  console.log("3. Exit\n");
};

const showModels = () => {
  console.log("\nAvailable Models");
  console.log("-------------------------------------------");

  AVAILABLE_MODELS.forEach((model, index) => {
    console.log(`${index + 1}. ${model.model}`);
  });

  console.log();
};

while (true) {
  printMenu();

  const choice = (await rl.question("Enter your choice (1-3): ")).trim();

  switch (choice) {
    case "1": {
      const userPrompt = await rl.question("\nEnter your question:\n> ");

      console.log("\nGenerating responses...\n");

      const answer = await selfConsistentlyAnswer({
        user_prompt: userPrompt,
        system_prompt: SYSTEM_PROMPT,
      });

      console.log("\n===========================================");
      console.log("FINAL REFINED ANSWER");
      console.log("===========================================\n");
      console.log(answer);

      await rl.question("\nPress Enter to return to the menu...");
      break;
    }

    case "2": {
      showModels();
      await rl.question("Press Enter to return to the menu...");
      break;
    }

    case "3": {
      console.log("\nThank you for using the application!");
      rl.close();
      process.exit(0);
    }

    default: {
      console.log("\nInvalid choice.");
      await rl.question("Press Enter to continue...");
    }
  }
}
