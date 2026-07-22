export const COURSE_DB_ALLOWED_TABLES = ["chunks"];

export const COURSE_DB_SCHEMA_DESCRIPTION = `Table chunks: chunk_id (text, primary key), video_id (text), video_title (text), module_name (text), order_in_video (integer), start_ms (integer), end_ms (integer), text (text, subtitle content for that chunk).
One row per subtitle chunk. A video has multiple chunks ordered by order_in_video. A module groups multiple videos.
Good for: how many videos are in a module, how many modules exist, list video titles in a module, how many chunks a video has, which module has the most videos.
Not available in this schema: video duration, publish dates, user progress, enrollment data.
start_ms and end_ms are the boundaries of that one chunk, not the whole video. Never compute AVG(end_ms - start_ms) across chunks to estimate video duration — that averages chunk length, which is meaningless. If asked for video duration, approximate it per video as MAX(end_ms) grouped by video_id (the last chunk's end time), for example: SELECT AVG(video_duration_ms) FROM (SELECT MAX(end_ms) AS video_duration_ms FROM chunks GROUP BY video_id) AS video_durations.`;
