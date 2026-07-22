import { buildQueryLlmClient, getPrimaryModel } from "./queryLlmClient.js";
import { synthesisSystemPromptHeader } from "./systemPrompts.js";
import type {
  ConsolidatedCitation,
  SynthesisCitation,
  SynthesizedAnswer,
} from "./types.js";

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildVideoContextBlock(citation: ConsolidatedCitation): string {
  return JSON.stringify({
    source: "video subtitle",
    videoId: citation.videoId,
    videoTitle: citation.videoTitle,
    moduleName: citation.moduleName,
    startMs: citation.startMs,
    endMs: citation.endMs,
    timestampRange: `${formatTimestamp(citation.startMs)}-${formatTimestamp(citation.endMs)}`,
    content: citation.content,
  });
}

function isSynthesisCitation(
  candidate: unknown,
): candidate is SynthesisCitation {
  if (typeof candidate !== "object" || candidate === null) return false;
  const citation = candidate as Record<string, unknown>;
  return (
    typeof citation.videoId === "string" &&
    typeof citation.videoTitle === "string" &&
    typeof citation.startMs === "number" &&
    typeof citation.endMs === "number" &&
    typeof citation.quotedSnippet === "string"
  );
}

function parseSynthesisResponse(rawContent: string): SynthesizedAnswer {
  try {
    const parsed = JSON.parse(rawContent);
    const citations = Array.isArray(parsed.citations)
      ? parsed.citations.filter(isSynthesisCitation)
      : [];
    const answerMarkdown =
      typeof parsed.answerMarkdown === "string"
        ? parsed.answerMarkdown
        : rawContent;
    return { answerMarkdown, citations };
  } catch {
    return { answerMarkdown: rawContent, citations: [] };
  }
}

export async function synthesizeAnswer(
  userQuery: string,
  videoCitations: ConsolidatedCitation[],
  sqlFactBlocks: string[],
): Promise<SynthesizedAnswer> {
  const contextBlocks = [
    ...videoCitations.map(buildVideoContextBlock),
    ...sqlFactBlocks,
  ];
  const systemPrompt = `${synthesisSystemPromptHeader}\n\nCourse Context:\n${contextBlocks.join("\n\n")}`;

  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getPrimaryModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery },
    ],
  });

  return parseSynthesisResponse(response.choices[0].message.content ?? "");
}
