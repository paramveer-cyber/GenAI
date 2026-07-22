import { buildQueryLlmClient, getPrimaryModel } from "./queryLlmClient.js";
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
    timestampRange: `${formatTimestamp(citation.startMs)}-${formatTimestamp(citation.endMs)}`,
    content: citation.content,
  });
}

const synthesisSystemPromptHeader = `You are an expert in answering user questions based on the provided course context.
Answer only using the provided context, never from general knowledge.
Respond with only JSON in this exact shape:
{"answerMarkdown": "...", "citations": [{"videoId": "...", "videoTitle": "...", "startMs": 0, "endMs": 0, "quotedSnippet": "..."}]}
answerMarkdown must include an inline citation marker after every claim: [Video: "<videoTitle>", <mm:ss>-<mm:ss>] for video subtitle context, or [course metadata] for course metadata context.
If the question has multiple parts, answer each part separately with its own citation, then combine them into one coherent answerMarkdown.
citations must contain one entry per distinct video segment actually cited in answerMarkdown, quotedSnippet being the exact supporting text from that segment.
If the context does not cover the question, say so in answerMarkdown and return an empty citations array.`;

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
