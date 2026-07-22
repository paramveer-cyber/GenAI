import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import { chunkGraderSystemPrompt, answerGraderSystemPrompt } from "./systemPrompts.js";
import type {
  CragGradeResult,
  CragReasonCode,
  RerankedChunk,
  SynthesizedAnswer,
} from "./types.js";

const validReasonCodes: CragReasonCode[] = [
  "no_relevant_content",
  "partial_coverage",
  "citation_mismatch",
  "ambiguous_query",
];

function parseGradeResponse(rawContent: string): CragGradeResult {
  try {
    const parsed = JSON.parse(rawContent);
    const score = typeof parsed.score === "number" ? parsed.score : 0;
    const reasonCode = validReasonCodes.includes(parsed.reasonCode)
      ? (parsed.reasonCode as CragReasonCode)
      : "no_relevant_content";
    return { score, reasonCode };
  } catch {
    return { score: 0, reasonCode: "no_relevant_content" };
  }
}

async function requestGrade(
  systemPrompt: string,
  userContent: string,
): Promise<CragGradeResult> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  return parseGradeResponse(response.choices[0].message.content ?? "");
}

export function gradeRetrievedChunks(
  userQuery: string,
  chunks: RerankedChunk[],
): Promise<CragGradeResult> {
  const chunksBlock = chunks
    .map((chunk, index) => `${index}: ${chunk.text}`)
    .join("\n\n");
  return requestGrade(
    chunkGraderSystemPrompt,
    `Question: ${userQuery}\n\nChunks:\n${chunksBlock}`,
  );
}

export function gradeSynthesizedAnswer(
  userQuery: string,
  synthesizedAnswer: SynthesizedAnswer,
  chunks: RerankedChunk[],
  sqlFactBlocks: string[] = [],
): Promise<CragGradeResult> {
  const chunksBlock = chunks
    .map((chunk) => `[${chunk.videoTitle}]: ${chunk.text}`)
    .join("\n\n");
  const availableContextBlock = [chunksBlock, ...sqlFactBlocks].join("\n\n");
  return requestGrade(
    answerGraderSystemPrompt,
    `Question: ${userQuery}\n\nAnswer:\n${synthesizedAnswer.answerMarkdown}\n\nAvailable course context:\n${availableContextBlock}`,
  );
}
