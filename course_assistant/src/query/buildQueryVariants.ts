import type { QueryVariant } from "./types.js";
import { classifyQuery } from "./queryClassifier.js";
import {
  rewriteQuery,
  stepBackQuery,
  decomposeIntoSubQuestions,
  generateHydeDocument,
} from "./queryTranslation.js";

export async function buildQueryVariants(rawQuestion: string): Promise<QueryVariant[]> {
  let classification = await classifyQuery(rawQuestion);
  let workingQuestion = rawQuestion;

  if (classification === "ambiguous") {
    workingQuestion = await rewriteQuery(rawQuestion);
    classification = await classifyQuery(workingQuestion);
  }

  const variants: QueryVariant[] = [{ text: workingQuestion, kind: "original" }];

  if (classification === "simple-factual") {
    const [rewritten, hydeDocument] = await Promise.all([
      rewriteQuery(workingQuestion),
      generateHydeDocument(workingQuestion),
    ]);
    variants.push({ text: rewritten, kind: "rewritten" });
    variants.push({ text: hydeDocument, kind: "hyde" });
  }

  if (classification === "compound") {
    const subQuestions = await decomposeIntoSubQuestions(workingQuestion);
    const rewrittenSubQuestions = await Promise.all(subQuestions.map(rewriteQuery));
    rewrittenSubQuestions.forEach((subQuestion) =>
      variants.push({ text: subQuestion, kind: "subquestion" })
    );
  }

  if (classification === "conceptual-broad") {
    const [stepBack, subQuestions] = await Promise.all([
      stepBackQuery(workingQuestion),
      decomposeIntoSubQuestions(workingQuestion),
    ]);
    variants.push({ text: stepBack, kind: "stepback" });
    subQuestions.forEach((subQuestion) =>
      variants.push({ text: subQuestion, kind: "subquestion" })
    );
  }

  return variants;
}
