const personaChannelMap: Record<string, string> = {
  "Hitesh Choudhary": "UCNQ6FEtztATuaVhZKCY28Yw",
  "Piyush Garg": "UCf9T51_FmMlfhiGpoes0yFA",
};

async function fetchYoutubeChannelData(personaTitle: string) {
  const channelId = personaChannelMap[personaTitle];
  if (!channelId) {
    throw new Error(`No youtube channel mapped for persona ${personaTitle}`);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not set in the environment");
  }

  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`,
  );
  const channelJson = await channelRes.json();
  const channel = channelJson.items?.[0];
  if (!channel) {
    throw new Error("Youtube channel not found");
  }

  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5&key=${apiKey}`,
  );
  const videosJson = await videosRes.json();
  const latestVideos = (videosJson.items ?? []).map((item: any) => ({
    title: item.snippet.title,
    videoId: item.snippet.resourceId.videoId,
    publishedAt: item.snippet.publishedAt,
    watchUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
  }));

  const playlistsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=10&key=${apiKey}`,
  );
  const playlistsJson = await playlistsRes.json();
  const playlists = (playlistsJson.items ?? []).map((item: any) => ({
    title: item.snippet.title,
    playlistId: item.id,
    itemCount: item.contentDetails.itemCount,
    playlistUrl: `https://www.youtube.com/playlist?list=${item.id}`,
  }));

  return {
    channelTitle: channel.snippet.title,
    subscriberCount: channel.statistics.subscriberCount,
    viewCount: channel.statistics.viewCount,
    videoCount: channel.statistics.videoCount,
    latestVideos,
    playlists,
  };
}

export interface ToolDescriptionType {
  toolName: string;
  toolSignature: string;
  toolDescription: string;
  toolFuncn: Function;
}

export const availableToolDesc: ToolDescriptionType[] = [
  {
    toolName: "fetchYoutubeChannelData",
    toolSignature: "fetchYoutubeChannelData() : YoutubeChannelSnapshot",
    toolDescription:
      "Fetch the current persona's youtube channel stats, latest uploaded videos and playlists. Takes no input, always resolves to the active persona's channel.",
    toolFuncn: fetchYoutubeChannelData,
  },
];
