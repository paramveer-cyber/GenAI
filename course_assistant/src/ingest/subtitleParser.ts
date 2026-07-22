import { readFileSync } from "node:fs";
import type { SubtitleCue } from "./types.js";

const timestampLinePattern =
  /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/;

function timestampToMs(hours: string, minutes: string, seconds: string, millis: string): number {
  return (
    Number(hours) * 3_600_000 +
    Number(minutes) * 60_000 +
    Number(seconds) * 1_000 +
    Number(millis)
  );
}

export function parseSubtitleFile(subtitleFilePath: string): SubtitleCue[] {
  const rawContent = readFileSync(subtitleFilePath, "utf8");
  const normalisedContent = rawContent.replace(/\r\n/g, "\n");
  const blocks = normalisedContent.split(/\n\s*\n/);

  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim().length > 0);
    const timestampLineIndex = lines.findIndex((line) => timestampLinePattern.test(line));
    if (timestampLineIndex === -1) continue;

    const timestampMatch = lines[timestampLineIndex].match(timestampLinePattern);
    if (!timestampMatch) continue;

    const [, startH, startM, startS, startMs, endH, endM, endS, endMs] = timestampMatch;
    const cueText = lines
      .slice(timestampLineIndex + 1)
      .join(" ")
      .trim();

    if (cueText.length === 0) continue;

    cues.push({
      startMs: timestampToMs(startH, startM, startS, startMs),
      endMs: timestampToMs(endH, endM, endS, endMs),
      text: cueText,
    });
  }

  return cues.sort((a, b) => a.startMs - b.startMs);
}
