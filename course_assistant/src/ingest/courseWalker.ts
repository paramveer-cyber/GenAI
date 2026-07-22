import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isJunkEntry } from "./fsHelpers.js";
import type { CourseVideo } from "./types.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractLeadingNumber(name: string): number | null {
  const match = name.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function cleanTitle(folderName: string): string {
  return folderName.replace(/_epm$/i, "").trim();
}

function listSubDirectories(parentDir: string): string[] {
  return readdirSync(parentDir).filter(
    (entry) => !isJunkEntry(entry) && statSync(join(parentDir, entry)).isDirectory()
  );
}

function pickSubtitleFile(videoDirPath: string): string | null {
  const filesInDir = readdirSync(videoDirPath).filter((entry) => !isJunkEntry(entry));
  const vttFile = filesInDir.find((entry) => entry.toLowerCase().endsWith(".vtt"));
  if (vttFile) return join(videoDirPath, vttFile);
  const srtFile = filesInDir.find((entry) => entry.toLowerCase().endsWith(".srt"));
  return srtFile ? join(videoDirPath, srtFile) : null;
}

export function discoverCourseVideos(courseRootDir: string): CourseVideo[] {
  const courseVideos: CourseVideo[] = [];

  listSubDirectories(courseRootDir).forEach((moduleName, moduleFallbackIndex) => {
    const moduleOrder = extractLeadingNumber(moduleName) ?? moduleFallbackIndex;
    const modulePath = join(courseRootDir, moduleName);

    listSubDirectories(modulePath).forEach((videoFolderName, videoFallbackIndex) => {
      const videoDirPath = join(modulePath, videoFolderName);
      const subtitleFilePath = pickSubtitleFile(videoDirPath);
      if (!subtitleFilePath) return;

      courseVideos.push({
        videoId: slugify(`${moduleName}-${videoFolderName}`),
        videoTitle: cleanTitle(videoFolderName),
        moduleName,
        moduleOrder,
        orderInModule: extractLeadingNumber(videoFolderName) ?? videoFallbackIndex,
        subtitleFilePath,
      });
    });
  });

  return courseVideos;
}
