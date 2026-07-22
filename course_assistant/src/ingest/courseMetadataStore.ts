import { getSharedPool } from "../db/pool.js";
import type { CourseChunk } from "./types.js";

export async function persistChunksToPostgres(chunks: CourseChunk[]): Promise<void> {
  if (chunks.length === 0) return;

  const pool = getSharedPool();
  for (const chunk of chunks) {
    await pool.query(
      `insert into chunks (chunk_id, video_id, video_title, module_name, order_in_video, start_ms, end_ms, text)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (chunk_id) do update set
         video_title = excluded.video_title,
         module_name = excluded.module_name,
         start_ms = excluded.start_ms,
         end_ms = excluded.end_ms,
         text = excluded.text`,
      [
        chunk.chunkId,
        chunk.videoId,
        chunk.videoTitle,
        chunk.moduleName,
        chunk.orderInVideo,
        chunk.startMs,
        chunk.endMs,
        chunk.text,
      ]
    );
  }
}
