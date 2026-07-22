import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import type { QueryClassLabel } from "./types.js";

const validLabels: QueryClassLabel[] = [
  "simple-factual",
  "compound",
  "ambiguous",
  "conceptual-broad",
];

const classifierSystemPrompt = `Classify the user question into exactly one label: simple-factual, compound, ambiguous, conceptual-broad.
simple-factual: a single direct factual lookup.
compound: multiple distinct questions or clauses joined together.
ambiguous: relies on unclear pronouns or missing context to understand what is being asked.
conceptual-broad: asks how something builds up, evolves, or wants a wide conceptual overview across the course.
Respond with only the label, nothing else.`;

export async function classifyQuery(question: string): Promise<QueryClassLabel> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    messages: [
      { role: "system", content: classifierSystemPrompt },
      { role: "user", content: question },
    ],
  });

  const label = response.choices[0].message.content?.trim().toLowerCase();
  return validLabels.includes(label as QueryClassLabel)
    ? (label as QueryClassLabel)
    : "simple-factual";
}
