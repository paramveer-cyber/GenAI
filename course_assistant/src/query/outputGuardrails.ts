import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import type {
  ConsolidatedCitation,
  SynthesizedAnswer,
  SynthesisCitation,
} from "./types.js";

const CITATION_TIMESTAMP_TOLERANCE_MS = 1000;

const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const phoneNumberPattern =
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;

export const failClosedAnswer: SynthesizedAnswer = {
  answerMarkdown: "I couldn't verify a grounded answer to this.",
  citations: [],
};

function logGuardrailFailure(
  stage: string,
  userQuery: string,
  detail: string,
): void {
  console.error(
    `[output-guardrail] stage=${stage} query="${userQuery}" detail="${detail}"`,
  );
}

function citationMatchesContext(
  citation: SynthesisCitation,
  videoCitations: ConsolidatedCitation[],
): boolean {
  return videoCitations.some(
    (contextCitation) =>
      contextCitation.videoId === citation.videoId &&
      citation.startMs <=
        contextCitation.endMs + CITATION_TIMESTAMP_TOLERANCE_MS &&
      citation.endMs >=
        contextCitation.startMs - CITATION_TIMESTAMP_TOLERANCE_MS,
  );
}

function verifyCitations(
  synthesizedAnswer: SynthesizedAnswer,
  videoCitations: ConsolidatedCitation[],
): string | null {
  const unmatchedCitation = synthesizedAnswer.citations.find(
    (citation) => !citationMatchesContext(citation, videoCitations),
  );
  if (!unmatchedCitation) return null;
  return `citation for video "${unmatchedCitation.videoTitle}" at ${unmatchedCitation.startMs}-${unmatchedCitation.endMs}ms does not match any retrieved context`;
}

function scanForPii(answerMarkdown: string): string | null {
  if (emailPattern.test(answerMarkdown))
    return "email address detected in answer text";
  if (phoneNumberPattern.test(answerMarkdown))
    return "phone number detected in answer text";
  return null;
}

async function checkModerationPolicy(
  answerMarkdown: string,
): Promise<string | null> {
  const client = buildQueryLlmClient();
  const moderationResult = await client.moderations.create({
    input: answerMarkdown,
  });
  const flaggedResult = moderationResult.results.find(
    (result) => result.flagged,
  );
  if (!flaggedResult) return null;
  const flaggedCategories = Object.entries(flaggedResult.categories)
    .filter(([, isFlagged]) => isFlagged)
    .map(([category]) => category)
    .join(", ");
  return `moderation flagged categories: ${flaggedCategories}`;
}

const scopeCheckSystemPrompt = `Check whether an answer stays strictly within the provided course context, with no general-knowledge filler the context does not support.
Respond with only JSON in the shape {"stayedInScope": true} or {"stayedInScope": false, "reason": "..."}.`;

interface ScopeCheckResult {
  stayedInScope: boolean;
  reason: string;
}

function parseScopeCheckResponse(rawContent: string): ScopeCheckResult {
  try {
    const parsed = JSON.parse(rawContent);
    return {
      stayedInScope: parsed.stayedInScope !== false,
      reason:
        typeof parsed.reason === "string"
          ? parsed.reason
          : "unspecified scope drift",
    };
  } catch {
    return { stayedInScope: true, reason: "unspecified scope drift" };
  }
}

async function checkAnswerStaysInScope(
  userQuery: string,
  synthesizedAnswer: SynthesizedAnswer,
  videoCitations: ConsolidatedCitation[],
): Promise<string | null> {
  const contextBlock = videoCitations
    .map((citation) => `[${citation.videoTitle}]: ${citation.content}`)
    .join("\n\n");
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: scopeCheckSystemPrompt },
      {
        role: "user",
        content: `Question: ${userQuery}\n\nContext:\n${contextBlock}\n\nAnswer:\n${synthesizedAnswer.answerMarkdown}`,
      },
    ],
  });
  const scopeCheckResult = parseScopeCheckResponse(
    response.choices[0].message.content ?? "",
  );
  return scopeCheckResult.stayedInScope ? null : scopeCheckResult.reason;
}

export async function applyOutputGuardrails(
  userQuery: string,
  synthesizedAnswer: SynthesizedAnswer,
  videoCitations: ConsolidatedCitation[],
): Promise<SynthesizedAnswer> {
  const citationFailureReason = verifyCitations(
    synthesizedAnswer,
    videoCitations,
  );
  if (citationFailureReason) {
    logGuardrailFailure(
      "citation_verification",
      userQuery,
      citationFailureReason,
    );
    return failClosedAnswer;
  }

  const piiFailureReason = scanForPii(synthesizedAnswer.answerMarkdown);
  if (piiFailureReason) {
    logGuardrailFailure("pii_scrub", userQuery, piiFailureReason);
    return failClosedAnswer;
  }

  const moderationFailureReason = await checkModerationPolicy(
    synthesizedAnswer.answerMarkdown,
  );
  if (moderationFailureReason) {
    logGuardrailFailure("policy_check", userQuery, moderationFailureReason);
    return failClosedAnswer;
  }

  const scopeFailureReason = await checkAnswerStaysInScope(
    userQuery,
    synthesizedAnswer,
    videoCitations,
  );
  if (scopeFailureReason) {
    logGuardrailFailure("scope_check", userQuery, scopeFailureReason);
    return failClosedAnswer;
  }

  return synthesizedAnswer;
}
