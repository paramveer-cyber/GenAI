export interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface CourseVideo {
  videoId: string;
  videoTitle: string;
  moduleName: string;
  moduleOrder: number;
  orderInModule: number;
  subtitleFilePath: string;
}

export interface CourseChunk {
  chunkId: string;
  videoId: string;
  videoTitle: string;
  moduleName: string;
  orderInVideo: number;
  startMs: number;
  endMs: number;
  text: string;
}
