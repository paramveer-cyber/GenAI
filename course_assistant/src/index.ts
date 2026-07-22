import { mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCourseZip } from "./ingest/extractZip.js";
import { discoverCourseVideos } from "./ingest/courseWalker.js";
import { parseSubtitleFile } from "./ingest/subtitleParser.js";
import { mergeCuesIntoChunks } from "./ingest/chunkMerger.js";
import { embedAndUpsertChunks } from "./ingest/embedAndStore.js";
import { persistChunksToPostgres } from "./ingest/courseMetadataStore.js";
import { isJunkEntry } from "./ingest/fsHelpers.js";
import type { CourseChunk } from "./ingest/types.js";

function findCourseRootDir(extractedDir: string): string {
  const topLevelDirs = readdirSync(extractedDir).filter(
    (entry) => !isJunkEntry(entry) && statSync(join(extractedDir, entry)).isDirectory()
  );
  return topLevelDirs.length === 1 ? join(extractedDir, topLevelDirs[0]) : extractedDir;
}

export async function ingestCourseFromZip(
  zipFilePath: string,
  collectionName: string
): Promise<CourseChunk[]> {
  const extractedDir = mkdtempSync(join(tmpdir(), "course-assistant-"));
  extractCourseZip(zipFilePath, extractedDir);
  const courseRootDir = findCourseRootDir(extractedDir);

  const courseVideos = discoverCourseVideos(courseRootDir);
  const allChunks: CourseChunk[] = [];

  for (const video of courseVideos) {
    const cues = parseSubtitleFile(video.subtitleFilePath);
    const chunks = mergeCuesIntoChunks(cues, video.videoId, video.videoTitle, video.moduleName);
    allChunks.push(...chunks);
  }

  await embedAndUpsertChunks(allChunks, collectionName);
  await persistChunksToPostgres(allChunks);

  return allChunks;
}
