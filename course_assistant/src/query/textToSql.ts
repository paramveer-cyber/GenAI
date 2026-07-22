import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import { sqlGenerationSystemPrompt } from "./systemPrompts.js";

export async function generateSqlForQuestion(question: string): Promise<string> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    messages: [
      { role: "system", content: sqlGenerationSystemPrompt },
      { role: "user", content: question },
    ],
  });
  return response.choices[0].message.content?.trim() ?? "";
}
