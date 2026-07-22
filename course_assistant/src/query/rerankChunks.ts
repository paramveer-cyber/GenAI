import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import type { RetrievedCandidateChunk, RerankedChunk } from "./types.js";

const TOP_K_AFTER_RERANK = 8;
const MAX_RERANK_ATTEMPTS = 2;

interface RerankLlmResponse {
  rankings: { index: number; score: number }[];
}

function fallbackToVectorScoreRanking(candidates: RetrievedCandidateChunk[]): RerankedChunk[] {
  return [...candidates]
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, TOP_K_AFTER_RERANK)
    .map((candidate) => ({ ...candidate, rerankScore: candidate.bestScore }));
}

async function requestRelevanceScores(
  originalQuery: string,
  candidates: RetrievedCandidateChunk[]
): Promise<RerankLlmResponse> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Score how relevant each numbered course transcript chunk is to answering the user question, on a 0-10 scale, 10 being directly and fully relevant.
Respond with only JSON in the shape {"rankings": [{"index": 0, "score": 7}]}, one entry per chunk.`,
      },
      {
        role: "user",
        content: `Question: ${originalQuery}\n\nChunks:\n${candidates
          .map((candidate, index) => `${index}: ${candidate.text}`)
          .join("\n\n")}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content ?? '{"rankings": []}');
}

export async function rerankCandidateChunks(
  originalQuery: string,
  candidates: RetrievedCandidateChunk[]
): Promise<RerankedChunk[]> {
  if (candidates.length === 0) return [];

  for (let attempt = 1; attempt <= MAX_RERANK_ATTEMPTS; attempt += 1) {
    try {
      const parsed = await requestRelevanceScores(originalQuery, candidates);
      const rankings = Array.isArray(parsed.rankings) ? parsed.rankings : [];
      if (rankings.length === 0) continue;

      const scoredCandidates = rankings
        .filter((ranking) => candidates[ranking.index] !== undefined)
        .map((ranking) => ({ ...candidates[ranking.index], rerankScore: ranking.score }));

      if (scoredCandidates.length === 0) continue;

      return scoredCandidates
        .sort((a, b) => b.rerankScore - a.rerankScore)
        .slice(0, TOP_K_AFTER_RERANK);
    } catch {
      continue;
    }
  }

  return fallbackToVectorScoreRanking(candidates);
}
