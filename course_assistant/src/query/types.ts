export type QueryClassLabel =
  | "simple-factual"
  | "compound"
  | "ambiguous"
  | "conceptual-broad";

export type QueryVariantKind =
  | "original"
  | "rewritten"
  | "stepback"
  | "subquestion"
  | "hyde";

export interface QueryVariant {
  text: string;
  kind: QueryVariantKind;
}

export type QuerySource = "vector" | "sql" | "both";

export interface RoutedVariant {
  variant: QueryVariant;
  source: QuerySource;
  rationale: string;
}

export interface RetrievedCandidateChunk {
  chunkId: string;
  videoId: string;
  videoTitle: string;
  moduleName: string;
  orderInVideo: number;
  startMs: number;
  endMs: number;
  text: string;
  bestScore: number;
  retrievedByVariantKinds: QueryVariantKind[];
}

export interface RerankedChunk extends RetrievedCandidateChunk {
  rerankScore: number;
}

export interface ConsolidatedCitation {
  videoId: string;
  videoTitle: string;
  moduleName: string;
  startMs: number;
  endMs: number;
  content: string;
}

export interface SynthesisCitation {
  videoId: string;
  videoTitle: string;
  startMs: number;
  endMs: number;
  quotedSnippet: string;
}

export interface SynthesizedAnswer {
  answerMarkdown: string;
  citations: SynthesisCitation[];
}

export type CragReasonCode =
  | "no_relevant_content"
  | "partial_coverage"
  | "citation_mismatch"
  | "ambiguous_query";

export interface CragGradeResult {
  score: number;
  reasonCode: CragReasonCode;
}
