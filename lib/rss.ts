/** 貼文互動指標（目前僅 X 來源會帶） */
export type FeedMetrics = {
  likes: number;
  replies: number;
  retweets: number;
  quotes: number;
  bookmarks?: number;
  impressions?: number;
};

/** 貼文型態（目前僅 X 來源會帶） */
export type FeedPostKind = "original" | "retweet" | "quote" | "reply";

/** 附圖／影音（目前僅 X 來源會帶） */
export type FeedMedia = {
  url: string;
  type: string;
  previewUrl?: string;
  alt?: string;
};

export type FeedItem = {
  title: string;
  link: string;
  guid: string;
  /** ISO 8601 或可被 Date 解析的時間字串 */
  pubDate: string;
  description: string;
  author?: string;
  category?: string;
  metrics?: FeedMetrics;
  /** original / retweet / quote / reply */
  kind?: FeedPostKind;
  media?: FeedMedia[];
};

/** 機器可解析的 metrics 鍵值字串（likes=1 replies=2 …） */
export function formatMetricsFields(metrics: FeedMetrics): string {
  const parts = [
    `likes=${metrics.likes}`,
    `replies=${metrics.replies}`,
    `retweets=${metrics.retweets}`,
    `quotes=${metrics.quotes}`,
  ];

  if (metrics.bookmarks != null) {
    parts.push(`bookmarks=${metrics.bookmarks}`);
  }
  if (metrics.impressions != null) {
    parts.push(`impressions=${metrics.impressions}`);
  }

  return parts.join(" ");
}

/** description 開頭用的 metrics 行，方便 agent 判斷熱度 */
export function formatMetricsLine(metrics: FeedMetrics): string {
  return `metrics ${formatMetricsFields(metrics)}`;
}

/** description 開頭用的 kind 行 */
export function formatKindLine(kind: FeedPostKind): string {
  return `kind=${kind}`;
}
