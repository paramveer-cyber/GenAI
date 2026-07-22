# Course Assistant

Ask natural-language questions over a course's subtitle corpus (`.srt`/`.vtt`) and get
answers grounded in the transcripts, with citations back to the exact video and
timestamp the answer came from.

```
 zip of subtitles ──▶ INGEST ──▶ answers, grounded, cited, or an honest "not covered"
```

---

## 1. System at a glance

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│         INGESTION            │        │            QUERY             │
│  zip → chunks → embeddings   │        │  question → routed retrieval │
│                               │        │  → graded → cited answer     │
└──────────────┬────────────────┘        └──────────────┬────────────────┘
               │                                          │
               ▼                                          ▼
        ┌─────────────┐                            ┌─────────────┐
        │   Qdrant     │◀──────────── search ───────│  Postgres    │
        │  (vectors)   │                            │  (chunks)    │
        └─────────────┘                            └─────────────┘
```

Two entry points, two pipelines, same storage:

```
npm run ingest <zipFilePath> <collectionName>
npm run query   <collectionName> "<question>"
```

---

## 2. Ingestion pipeline

```
 course.zip
     │
     ▼
┌───────────────┐
│ extractZip     │  unzip to a temp dir
└───────┬────────┘
        ▼
┌───────────────┐
│ courseWalker   │  walk module/video folder tree, find subtitle files
└───────┬────────┘
        ▼
┌───────────────┐
│ subtitleParser │  .srt/.vtt → [{ startMs, endMs, text }, ...] cues
└───────┬────────┘
        ▼
┌───────────────┐
│ chunkMerger    │  merge cues → word-bounded chunks, one per video segment
└───────┬────────┘
        ▼
   ┌────┴─────┐
   ▼          ▼
┌────────┐ ┌──────────────────┐
│ Qdrant │ │ Postgres (chunks)  │
│ vectors│ │ metadata + text    │
└────────┘ └──────────────────┘
```

Each chunk keeps:

```
{
  chunkId, videoId, videoTitle, moduleName,
  orderInVideo, startMs, endMs, text
}
```

`startMs`/`endMs` survive every step below — that's what makes citations possible.

---

## 3. Query pipeline (top level)

```
                          user question
                                │
                                ▼
                    ┌───────────────────────┐
                    │  buildQueryVariants     │  classify + rewrite/stepback/
                    │                         │  decompose/HyDE
                    └───────────┬─────────────┘
                                ▼
                    ┌───────────────────────┐
                    │  queryRouter            │  per variant: vector / sql / both
                    └───────────┬─────────────┘
                     ┌──────────┴───────────┐
                     ▼                      ▼
           ┌──────────────────┐   ┌──────────────────────┐
           │ vector variants   │   │ sql variants           │
           └────────┬──────────┘   └───────────┬────────────┘
                     ▼                          ▼
        ┌────────────────────────┐   ┌──────────────────────┐
        │ CRAG retrieval loop     │   │ textToSql +            │
        │ (§4 below)              │   │ sqlRetrieval (readonly)│
        └────────────┬─────────────┘   └───────────┬────────────┘
                     └───────────────┬──────────────┘
                                     ▼
                         ┌───────────────────────┐
                         │  synthesizeAnswer       │  cited answer, JSON
                         └───────────┬─────────────┘
                                     ▼
                         ┌───────────────────────┐
                         │  outputGuardrails       │  §5 below
                         └───────────┬─────────────┘
                                     ▼
                          answerMarkdown + citations
```

If a question has no vector-routed variants (pure metadata lookup, e.g. "how many
videos in module 3"), the CRAG loop is skipped entirely and the SQL facts go
straight to synthesis.

---

## 4. CRAG loop — self-correcting retrieval

```
        ┌─────────────────────────────────────────────┐
        │                attempt loop                  │
        │            (max MAX_RETRIES + 1)              │
        └─────────────────────────────────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ retrieveForVariants   │  vector search, top-20/variant
                 └──────────┬────────────┘
                            ▼
                 ┌─────────────────────┐
                 │ rerankCandidateChunks │  LLM rerank, top-8
                 └──────────┬────────────┘
                            ▼
                    empty? ──yes──▶ refine query, retry
                            │no
                            ▼
                 ┌─────────────────────┐
                 │ gradeRetrievedChunks  │  score 0-10
                 └──────────┬────────────┘
                            ▼
                 score<6? ──yes──▶ refine query, retry
                            │no
                            ▼
                 ┌─────────────────────┐
                 │ consolidateTimestamps │  merge adjacent chunks/video
                 └──────────┬────────────┘
                            ▼
                 ┌─────────────────────┐
                 │ synthesizeAnswer      │
                 └──────────┬────────────┘
                            ▼
                 ┌─────────────────────┐
                 │ gradeSynthesizedAnswer│  score 0-10
                 └──────────┬────────────┘
                            ▼
                 score>=6? ──yes──▶ outputGuardrails ──▶ return answer
                            │no
                            ▼
                     refine query, retry
                            │
                 (retries exhausted)
                            ▼
              "Insufficient course content to answer confidently."
```

Refinement is reason-coded: `no_relevant_content` → step-back query,
`ambiguous_query` → rewrite, `partial_coverage` → rewrite,
`citation_mismatch` → same query, stricter rerank-score floor.

---

## 5. Output guardrails (Chapter 8)

Runs on every synthesized answer, vector-sourced or SQL-only, right before it
reaches the user. Fails closed — any failed check discards the answer wholesale,
never patches it.

```
 synthesized answer
        │
        ▼
┌─────────────────────┐
│ 1. citation check     │  programmatic, no LLM call
│   every citation's     │──fail──┐
│   videoId+timestamp    │        │
│   must overlap a chunk │        │
│   actually retrieved   │        │
└──────────┬─────────────┘        │
           │pass                  │
           ▼                      │
┌─────────────────────┐           │
│ 2. PII scrub          │──fail──┤
│   regex: email, phone │           │
└──────────┬─────────────┘           │
           │pass                     │
           ▼                        │
┌─────────────────────┐           │
│ 3. moderation check   │──fail──┤
│   OpenAI moderation    │           │
│   API on final text    │           │
└──────────┬─────────────┘           │
           │pass                     │
           ▼                        │
┌─────────────────────┐           │
│ 4. scope check        │──fail──┤
│   LLM: any claim not   │           │
│   grounded in context? │           │
└──────────┬─────────────┘           │
           │pass                     ▼
           ▼               ┌───────────────────────┐
   return answer as-is     │ "I couldn't verify a    │
                           │  grounded answer to     │
                           │  this." + logged reason │
                           └───────────────────────┘
```

Checks run cheapest-first and short-circuit on the first failure, so a bad
answer never pays for a moderation call or an LLM scope check it doesn't need.

---

## 6. Data model

```
Postgres                              Qdrant
┌───────────────────────┐             collection: <collectionName>
│ chunks                 │             ┌─────────────────────────┐
│  chunk_id      PK      │             │ point per chunk           │
│  video_id               │             │  vector: embedding(text)   │
│  video_title             │             │  payload: {                │
│  module_name             │◀───same────│    chunkId, videoId,        │
│  order_in_video           │  chunk    │    videoTitle, moduleName,  │
│  start_ms / end_ms        │  data     │    orderInVideo,            │
│  text                     │             │    startMs, endMs }         │
└───────────────────────┘             └─────────────────────────┘
```

Postgres is the source of truth for SQL-routed metadata questions
("how many videos in module 3"); Qdrant is the retrieval index for
conceptual/explanatory questions.

---

## 7. Project layout

```
src/
├── index.ts              ingest orchestration
├── query.ts               query orchestration
├── cli-ingest.ts           npm run ingest
├── cli-query.ts             npm run query
├── db/
│   └── pool.ts              shared pg Pool
├── ingest/
│   ├── extractZip.ts
│   ├── courseWalker.ts
│   ├── subtitleParser.ts
│   ├── chunkMerger.ts
│   ├── embeddingsClient.ts
│   ├── embedAndStore.ts
│   ├── courseMetadataStore.ts
│   ├── deterministicUuid.ts
│   ├── fsHelpers.ts
│   └── types.ts
└── query/
    ├── queryClassifier.ts
    ├── buildQueryVariants.ts
    ├── queryTranslation.ts
    ├── queryRouter.ts
    ├── textToSql.ts
    ├── sqlRetrieval.ts
    ├── courseDbSchemaDescription.ts
    ├── retrieveForVariants.ts
    ├── rerankChunks.ts
    ├── cragGrader.ts
    ├── cragLoop.ts
    ├── consolidateTimestamps.ts
    ├── synthesizeAnswer.ts
    ├── outputGuardrails.ts
    ├── queryLlmClient.ts
    └── types.ts
```

---

## 8. Setup

```
cp .env.example .env        # fill OPENAI_API_KEY, PRIMARY_MODEL, SECONDARY_MODEL
docker compose up -d        # qdrant :6333, postgres :5432
psql "$DATABASE_URL" -f sql/schema.sql

npm install
npm run ingest ./course.zip my-course
npm run query my-course "what is a closure?"
```

```
┌──────────┐   ┌──────────┐
│  Qdrant   │   │ Postgres  │
│  :6333    │   │  :5432    │
└──────────┘   └──────────┘
     ▲               ▲
     └───────┬───────┘
        docker-compose.yml
```
