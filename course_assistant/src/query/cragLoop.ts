import type { QdrantVectorStore } from "@langchain/qdrant";
import type { OpenAIEmbeddings } from "@langchain/openai";
import { retrieveForVariants } from "./retrieveForVariants.js";
import { rerankCandidateChunks } from "./rerankChunks.js";
import { consolidateChunksIntoCitations } from "./consolidateTimestamps.js";
import { synthesizeAnswer } from "./synthesizeAnswer.js";
import { gradeRetrievedChunks, gradeSynthesizedAnswer } from "./cragGrader.js";
import { rewriteQuery, stepBackQuery } from "./queryTranslation.js";
import { applyOutputGuardrails } from "./outputGuardrails.js";
import type {
  CragReasonCode,
  QueryVariant,
  RerankedChunk,
  SynthesizedAnswer,
} from "./types.js";

const MAX_RETRIES = 2;
const PASSING_SCORE = 6;
const STRICT_RERANK_SCORE_FLOOR = 7;

const abstainAnswer: SynthesizedAnswer = {
  answerMarkdown: "Insufficient course content to answer confidently.",
  citations: [],
};

function logRetryAttempt(
  attempt: number,
  variant: QueryVariant,
  score: number,
  reasonCode: CragReasonCode,
): void {
  console.log(
    `[crag] retry ${attempt}: variant="${variant.text}" score=${score} reason=${reasonCode}`,
  );
}

async function refineVariantForRetry(
  userQuery: string,
  currentVariant: QueryVariant,
  reasonCode: CragReasonCode,
): Promise<QueryVariant> {
  if (reasonCode === "no_relevant_content") {
    return { text: await stepBackQuery(userQuery), kind: "stepback" };
  }
  if (reasonCode === "ambiguous_query") {
    return { text: await rewriteQuery(userQuery), kind: "rewritten" };
  }
  if (reasonCode === "partial_coverage") {
    return { text: await rewriteQuery(currentVariant.text), kind: "rewritten" };
  }
  return currentVariant;
}

interface RetryPlan {
  vectorVariants: QueryVariant[];
  rerankScoreFloor: number;
}

async function planRetryOrAbstain(
  attempt: number,
  userQuery: string,
  vectorVariants: QueryVariant[],
  score: number,
  reasonCode: CragReasonCode,
): Promise<RetryPlan | null> {
  if (attempt === MAX_RETRIES) return null;
  const [currentVariant, ...remainingVariants] = vectorVariants;
  logRetryAttempt(attempt, currentVariant, score, reasonCode);
  const refinedVariant = await refineVariantForRetry(
    userQuery,
    currentVariant,
    reasonCode,
  );
  return {
    vectorVariants: [refinedVariant, ...remainingVariants],
    rerankScoreFloor:
      reasonCode === "citation_mismatch" ? STRICT_RERANK_SCORE_FLOOR : 0,
  };
}

export async function runCorrectiveRetrievalLoop(
  userQuery: string,
  initialVectorVariants: QueryVariant[],
  vectorStore: QdrantVectorStore,
  embeddingsClient: OpenAIEmbeddings,
  sqlFactBlocks: string[],
): Promise<SynthesizedAnswer> {
  let vectorVariants = initialVectorVariants;
  let rerankScoreFloor = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const candidateChunks = await retrieveForVariants(
      vectorVariants,
      vectorStore,
      embeddingsClient,
    );
    let rerankedChunks: RerankedChunk[] = await rerankCandidateChunks(
      userQuery,
      candidateChunks,
    );
    if (rerankScoreFloor > 0) {
      rerankedChunks = rerankedChunks.filter(
        (chunk) => chunk.rerankScore >= rerankScoreFloor,
      );
    }

    if (rerankedChunks.length === 0) {
      const retryPlan = await planRetryOrAbstain(
        attempt,
        userQuery,
        vectorVariants,
        0,
        "no_relevant_content",
      );
      if (!retryPlan) return abstainAnswer;
      vectorVariants = retryPlan.vectorVariants;
      rerankScoreFloor = retryPlan.rerankScoreFloor;
      continue;
    }

    const chunkGrade = await gradeRetrievedChunks(userQuery, rerankedChunks);
    if (chunkGrade.score < PASSING_SCORE) {
      const retryPlan = await planRetryOrAbstain(
        attempt,
        userQuery,
        vectorVariants,
        chunkGrade.score,
        chunkGrade.reasonCode,
      );
      if (!retryPlan) return abstainAnswer;
      vectorVariants = retryPlan.vectorVariants;
      rerankScoreFloor = retryPlan.rerankScoreFloor;
      continue;
    }

    const videoCitations = consolidateChunksIntoCitations(rerankedChunks);
    const synthesizedAnswer = await synthesizeAnswer(
      userQuery,
      videoCitations,
      sqlFactBlocks,
    );

    const answerGrade = await gradeSynthesizedAnswer(
      userQuery,
      synthesizedAnswer,
      rerankedChunks,
      sqlFactBlocks,
    );
    if (answerGrade.score >= PASSING_SCORE) {
      return applyOutputGuardrails(
        userQuery,
        synthesizedAnswer,
        videoCitations,
        sqlFactBlocks,
      );
    }

    const retryPlan = await planRetryOrAbstain(
      attempt,
      userQuery,
      vectorVariants,
      answerGrade.score,
      answerGrade.reasonCode,
    );
    if (!retryPlan) return abstainAnswer;
    vectorVariants = retryPlan.vectorVariants;
    rerankScoreFloor = retryPlan.rerankScoreFloor;
  }

  return abstainAnswer;
}
