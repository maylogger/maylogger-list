export interface YouTubeProfile {
  id: string;
  username: string;
  displayName: string;
  description: string;
  link: string;
  profilePictureUrl?: string;
  coverImageUrl?: string;
}

interface YouTubeChannelResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description?: string;
      customUrl?: string;
      thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
    };
    brandingSettings?: {
      image?: {
        bannerExternalUrl?: string;
      };
    };
  }>;
  error?: {
    message?: string;
  };
}

function getYouTubeApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 YOUTUBE_API_KEY，請先在 .env.local 設定。");
  }
  return apiKey;
}

function getLargestThumbnail(
  thumbnails: Record<string, { url: string; width?: number; height?: number }> | undefined,
) {
  return Object.values(thumbnails ?? {}).toSorted(
    (left, right) =>
      (right.width ?? 0) * (right.height ?? 0) - (left.width ?? 0) * (left.height ?? 0),
  )[0]?.url;
}

/** 以 YouTube Channel ID 取得公開 profile 資訊 */
export async function getYouTubeProfile(channelId: string): Promise<YouTubeProfile> {
  const params = new URLSearchParams({
    part: "snippet,brandingSettings",
    id: channelId,
    key: getYouTubeApiKey(),
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, {
    next: { revalidate: 300 },
  });
  const body = (await response.json()) as YouTubeChannelResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? `YouTube API 請求失敗（${response.status}）`);
  }

  const channel = body.items?.[0];
  if (!channel) {
    throw new Error(`找不到 YouTube Channel ID ${channelId}`);
  }

  const username = channel.snippet.customUrl?.replace(/^@/, "") ?? channel.id;
  const profilePictureUrl = getLargestThumbnail(channel.snippet.thumbnails);
  const coverImageUrl = channel.brandingSettings?.image?.bannerExternalUrl;

  return {
    id: channel.id,
    username,
    displayName: channel.snippet.title,
    description: channel.snippet.description ?? "",
    link: channel.snippet.customUrl
      ? `https://www.youtube.com/${channel.snippet.customUrl}`
      : `https://www.youtube.com/channel/${channel.id}`,
    ...(profilePictureUrl ? { profilePictureUrl } : {}),
    ...(coverImageUrl ? { coverImageUrl } : {}),
  };
}
