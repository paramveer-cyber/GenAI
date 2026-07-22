import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";

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
  return askLlmForText(
    "Rewrite the user question to be clear and self-contained, resolving ambiguous pronouns or shorthand. Respond with only the rewritten question, nothing else.",
    question
  );
}

export function stepBackQuery(question: string): Promise<string> {
  return askLlmForText(
    "Generate a more general, conceptual version of the user question that asks about the underlying mechanism or principle rather than the specific detail. Respond with only the generalized question, nothing else.",
    question
  );
}

export function generateHydeDocument(question: string): Promise<string> {
  return askLlmForText(
    "Write a short hypothetical passage, in the style of a course video transcript, that would directly answer the user question. A few sentences, confident explanatory tone. Respond with only the passage, nothing else.",
    question
  );
}

export async function decomposeIntoSubQuestions(question: string): Promise<string[]> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Split the user question into independent sub-questions, one per distinct clause or topic. Respond with only JSON in the shape {"subQuestions": ["...", "..."]}.',
      },
      { role: "user", content: question },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? '{"subQuestions": []}');
  const subQuestions = Array.isArray(parsed.subQuestions) ? parsed.subQuestions : [];
  return subQuestions.length > 0 ? subQuestions : [question];
}
