import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
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

const chunkGraderSystemPrompt = `Grade how well the retrieved course transcript chunks address the user question, on a 0-10 scale.
10 means the chunks fully and directly address the question. 0 means completely irrelevant.
If the score is below 6, pick the single best reasonCode: no_relevant_content (chunks are off-topic), partial_coverage (chunks address only part of the question), ambiguous_query (the question itself is unclear or missing context).
Respond with only JSON in the shape {"score": 7, "reasonCode": "partial_coverage"}.`;

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

const answerGraderSystemPrompt = `Grade how well the answer is grounded in the provided course context, on a 0-10 scale.
10 means every claim is fully supported by the cited chunks and every citation accurately matches the content it points to. 0 means unsupported or wrong citations.
If the score is below 6, pick the single best reasonCode: no_relevant_content (context does not address the question), partial_coverage (answer covers only part of the question), citation_mismatch (a citation does not actually support its claim), ambiguous_query (the question itself is unclear or missing context).
Respond with only JSON in the shape {"score": 7, "reasonCode": "citation_mismatch"}.`;

export function gradeSynthesizedAnswer(
  userQuery: string,
  synthesizedAnswer: SynthesizedAnswer,
  chunks: RerankedChunk[],
): Promise<CragGradeResult> {
  const chunksBlock = chunks
    .map((chunk) => `[${chunk.videoTitle}]: ${chunk.text}`)
    .join("\n\n");
  return requestGrade(
    answerGraderSystemPrompt,
    `Question: ${userQuery}\n\nAnswer:\n${synthesizedAnswer.answerMarkdown}\n\nAvailable cited chunks:\n${chunksBlock}`,
  );
}
