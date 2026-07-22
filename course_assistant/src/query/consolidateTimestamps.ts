import type { RerankedChunk, ConsolidatedCitation } from "./types.js";

const ADJACENCY_GAP_MS = 5000;

function mergeChunksInSameVideo(
  chunksInVideo: RerankedChunk[],
): ConsolidatedCitation[] {
  const sortedChunks = [...chunksInVideo].sort((a, b) => a.startMs - b.startMs);
  const citations: ConsolidatedCitation[] = [];

  for (const chunk of sortedChunks) {
    const lastCitation = citations[citations.length - 1];
    const isAdjacentOrOverlapping =
      lastCitation !== undefined &&
      chunk.startMs <= lastCitation.endMs + ADJACENCY_GAP_MS;

    if (isAdjacentOrOverlapping) {
      lastCitation.endMs = Math.max(lastCitation.endMs, chunk.endMs);
      lastCitation.content = `${lastCitation.content} ${chunk.text}`;
      continue;
    }

    citations.push({
      videoId: chunk.videoId,
      videoTitle: chunk.videoTitle,
      moduleName: chunk.moduleName,
      startMs: chunk.startMs,
      endMs: chunk.endMs,
      content: chunk.text,
    });
  }

  return citations;
}

export function consolidateChunksIntoCitations(
  chunks: RerankedChunk[],
): ConsolidatedCitation[] {
  const chunksByVideoId = new Map<string, RerankedChunk[]>();

  for (const chunk of chunks) {
    const chunksInVideo = chunksByVideoId.get(chunk.videoId) ?? [];
    chunksInVideo.push(chunk);
    chunksByVideoId.set(chunk.videoId, chunksInVideo);
  }

  return Array.from(chunksByVideoId.values()).flatMap(mergeChunksInSameVideo);
}
