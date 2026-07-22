import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import {
  rewriteQuerySystemPrompt,
  stepBackQuerySystemPrompt,
  hydeDocumentSystemPrompt,
  decomposeSubQuestionsSystemPrompt,
} from "./systemPrompts.js";

async function askLlmForText(systemPrompt: string, userText: string): Promise<string> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
  });
  return response.choices[0].message.content?.trim() ?? userText;
}

export function rewriteQuery(question: string): Promise<string> {
  return askLlmForText(rewriteQuerySystemPrompt, question);
}

export function stepBackQuery(question: string): Promise<string> {
  return askLlmForText(stepBackQuerySystemPrompt, question);
}

export function generateHydeDocument(question: string): Promise<string> {
  return askLlmForText(hydeDocumentSystemPrompt, question);
}

export async function decomposeIntoSubQuestions(question: string): Promise<string[]> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: decomposeSubQuestionsSystemPrompt },
      { role: "user", content: question },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? '{"subQuestions": []}');
  const subQuestions = Array.isArray(parsed.subQuestions) ? parsed.subQuestions : [];
  return subQuestions.length > 0 ? subQuestions : [question];
}
