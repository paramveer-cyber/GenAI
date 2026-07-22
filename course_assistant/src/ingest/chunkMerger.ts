import type { CourseChunk, SubtitleCue } from "./types.js";

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function buildChunkFromCues(
  cues: SubtitleCue[],
  videoId: string,
  videoTitle: string,
  moduleName: string,
  orderInVideo: number
): CourseChunk {
  return {
    chunkId: `${videoId}::${orderInVideo}`,
    videoId,
    videoTitle,
    moduleName,
    orderInVideo,
    startMs: cues[0].startMs,
    endMs: cues[cues.length - 1].endMs,
    text: cues.map((cue) => cue.text).join(" "),
  };
}

export function mergeCuesIntoChunks(
  cues: SubtitleCue[],
  videoId: string,
  videoTitle: string,
  moduleName: string,
  targetWordsPerChunk = 60,
  overlapWords = 24
): CourseChunk[] {
  const chunks: CourseChunk[] = [];
  let cueIndex = 0;
  let orderInVideo = 0;

  while (cueIndex < cues.length) {
    let wordCount = 0;
    let scanIndex = cueIndex;
    while (scanIndex < cues.length && wordCount < targetWordsPerChunk) {
      wordCount += countWords(cues[scanIndex].text);
      scanIndex += 1;
    }

    const chunkCues = cues.slice(cueIndex, scanIndex);
    chunks.push(buildChunkFromCues(chunkCues, videoId, videoTitle, moduleName, orderInVideo));
    orderInVideo += 1;

    if (scanIndex >= cues.length) break;

    let overlapWordCount = 0;
    let overlapStartIndex = scanIndex;
    while (overlapStartIndex > cueIndex && overlapWordCount < overlapWords) {
      overlapStartIndex -= 1;
      overlapWordCount += countWords(cues[overlapStartIndex].text);
    }

    cueIndex = Math.max(overlapStartIndex, cueIndex + 1);
  }

  return chunks;
}
