import type { QdrantVectorStore } from "@langchain/qdrant";
import type { OpenAIEmbeddings } from "@langchain/openai";
import type { QueryVariant, RetrievedCandidateChunk } from "./types.js";

const CANDIDATES_PER_VARIANT = 20;

async function searchVariant(
  variant: QueryVariant,
  vectorStore: QdrantVectorStore,
  embeddingsClient: OpenAIEmbeddings
) {
  if (variant.kind === "hyde") {
    const hydeVector = await embeddingsClient.embedQuery(variant.text);
    return vectorStore.similaritySearchVectorWithScore(hydeVector, CANDIDATES_PER_VARIANT);
  }
  return vectorStore.similaritySearchWithScore(variant.text, CANDIDATES_PER_VARIANT);
}

export async function retrieveForVariants(
  variants: QueryVariant[],
  vectorStore: QdrantVectorStore,
  embeddingsClient: OpenAIEmbeddings
): Promise<RetrievedCandidateChunk[]> {
  const resultsPerVariant = await Promise.all(
    variants.map(async (variant) => ({
      variant,
      scoredDocuments: await searchVariant(variant, vectorStore, embeddingsClient),
    }))
  );

  const candidatesByChunkId = new Map<string, RetrievedCandidateChunk>();

  for (const { variant, scoredDocuments } of resultsPerVariant) {
    for (const [document, score] of scoredDocuments) {
      const chunkId = document.metadata.chunkId as string;
      const existingCandidate = candidatesByChunkId.get(chunkId);

      if (!existingCandidate) {
        candidatesByChunkId.set(chunkId, {
          chunkId,
          videoId: document.metadata.videoId as string,
          videoTitle: document.metadata.videoTitle as string,
          moduleName: document.metadata.moduleName as string,
          orderInVideo: document.metadata.orderInVideo as number,
          startMs: document.metadata.startMs as number,
          endMs: document.metadata.endMs as number,
          text: document.pageContent,
          bestScore: score,
          retrievedByVariantKinds: [variant.kind],
        });
        continue;
      }

      existingCandidate.bestScore = Math.max(existingCandidate.bestScore, score);
      if (!existingCandidate.retrievedByVariantKinds.includes(variant.kind)) {
        existingCandidate.retrievedByVariantKinds.push(variant.kind);
      }
    }
  }

  return Array.from(candidatesByChunkId.values());
}
