create table if not exists chunks (
  chunk_id text primary key,
  video_id text not null,
  video_title text not null,
  module_name text not null,
  order_in_video integer not null,
  start_ms integer not null,
  end_ms integer not null,
  text text not null
);

create index if not exists chunks_video_id_idx on chunks (video_id);
