import { QdrantVectorStore } from "@langchain/qdrant";
import { buildEmbeddingsClient } from "./ingest/embeddingsClient.js";
import { buildQueryVariants } from "./query/buildQueryVariants.js";
import { routeQueryVariants } from "./query/queryRouter.js";
import { generateSqlForQuestion } from "./query/textToSql.js";
import { runReadOnlySql } from "./query/sqlRetrieval.js";
import { runCorrectiveRetrievalLoop } from "./query/cragLoop.js";
import { synthesizeAnswer } from "./query/synthesizeAnswer.js";
import { applyOutputGuardrails } from "./query/outputGuardrails.js";
import type { SynthesizedAnswer } from "./query/types.js";

export async function queryCourse(
  userQuery: string,
  collectionName: string,
): Promise<SynthesizedAnswer> {
  const embeddingsClient = buildEmbeddingsClient();
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddingsClient,
    {
      url: process.env.QDRANT_URL ?? "http://localhost:6333",
      collectionName,
    },
  );

  const queryVariants = await buildQueryVariants(userQuery);
  const routedVariants = await routeQueryVariants(queryVariants);

  const vectorVariants = routedVariants
    .filter((routed) => routed.source === "vector" || routed.source === "both")
    .map((routed) => routed.variant);
  const sqlVariants = routedVariants
    .filter((routed) => routed.source === "sql" || routed.source === "both")
    .map((routed) => routed.variant);

  const sqlFactBlocks = await Promise.all(
    sqlVariants.map(async (variant) => {
      const generatedSql = await generateSqlForQuestion(variant.text);
      const rows = await runReadOnlySql(generatedSql);
      if (!rows || rows.length === 0) return null;
      return JSON.stringify({
        source: "course metadata",
        question: variant.text,
        rows,
      });
    }),
  );
  const nonEmptySqlFactBlocks = sqlFactBlocks.filter(
    (block): block is string => block !== null,
  );

  if (vectorVariants.length === 0) {
    const sqlOnlyAnswer = await synthesizeAnswer(
      userQuery,
      [],
      nonEmptySqlFactBlocks,
    );
    return applyOutputGuardrails(userQuery, sqlOnlyAnswer, []);
  }

  return runCorrectiveRetrievalLoop(
    userQuery,
    vectorVariants,
    vectorStore,
    embeddingsClient,
    nonEmptySqlFactBlocks,
  );
}
