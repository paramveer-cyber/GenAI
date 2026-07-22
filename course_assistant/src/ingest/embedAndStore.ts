import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import { Document } from "@langchain/core/documents";
import {
  buildEmbeddingsClient,
  EMBEDDING_DIMENSIONS,
} from "./embeddingsClient.js";
import { deterministicUuidFromString } from "./deterministicUuid.js";
import type { CourseChunk } from "./types.js";

function getQdrantUrl(): string {
  return process.env.QDRANT_URL ?? "http://localhost:6333";
}

async function ensureCollectionExists(collectionName: string): Promise<void> {
  const qdrantClient = new QdrantClient({ url: getQdrantUrl() });
  const existingCollections = await qdrantClient.getCollections();
  const alreadyExists = existingCollections.collections.some(
    (collection) => collection.name === collectionName,
  );
  if (alreadyExists) return;

  await qdrantClient.createCollection(collectionName, {
    vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
  });
}

function chunkToDocument(chunk: CourseChunk): Document {
  return new Document({
    pageContent: chunk.text,
    metadata: {
      chunkId: chunk.chunkId,
      videoId: chunk.videoId,
      videoTitle: chunk.videoTitle,
      moduleName: chunk.moduleName,
      orderInVideo: chunk.orderInVideo,
      startMs: chunk.startMs,
      endMs: chunk.endMs,
    },
  });
}

function chunkArray<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export async function embedAndUpsertChunks(
  chunks: CourseChunk[],
  collectionName: string,
): Promise<void> {
  if (chunks.length === 0) return;

  await ensureCollectionExists(collectionName);
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    buildEmbeddingsClient(),
    {
      url: getQdrantUrl(),
      collectionName,
    },
  );

  const batches = chunkArray(chunks, 100);
  for (const batch of batches) {
    try {
      await vectorStore.addDocuments(batch.map(chunkToDocument), {
        ids: batch.map((chunk) => deterministicUuidFromString(chunk.chunkId)),
      });
    } catch (error) {
      console.error(
        "qdrant upsert failed for batch",
        batch[0].chunkId,
        "to",
        batch[batch.length - 1].chunkId,
      );
      console.error(error instanceof Error ? (error.cause ?? error) : error);
      throw error;
    }
  }
}
