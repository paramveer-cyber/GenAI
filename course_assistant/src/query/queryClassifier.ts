import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import { queryClassifierSystemPrompt } from "./systemPrompts.js";
import type { QueryClassLabel } from "./types.js";

const validLabels: QueryClassLabel[] = [
  "simple-factual",
  "compound",
  "ambiguous",
  "conceptual-broad",
];

export async function classifyQuery(question: string): Promise<QueryClassLabel> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    messages: [
      { role: "system", content: queryClassifierSystemPrompt },
      { role: "user", content: question },
    ],
  });

  const label = response.choices[0].message.content?.trim().toLowerCase();
  return validLabels.includes(label as QueryClassLabel)
    ? (label as QueryClassLabel)
    : "simple-factual";
}
