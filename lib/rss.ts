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
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

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

function toRfc822(value: string) {
  return new Date(value).toUTCString();
}

export function buildRssFeed(options: {
  title: string;
  description: string;
  link: string;
  feedUrl: string;
  items: FeedItem[];
}) {
  const { title, description, link, feedUrl, items } = options;
  const lastBuildDate =
    items[0]?.pubDate != null ? toRfc822(items[0].pubDate) : new Date().toUTCString();

  const itemXml = items
    .map((item) => {
      const category =
        item.category != null && item.category !== ""
          ? `\n      <category>${escapeXml(item.category)}</category>`
          : "";
      const metricsCategory =
        item.metrics != null
          ? `\n      <category domain="metrics">${escapeXml(formatMetricsFields(item.metrics))}</category>`
          : "";
      const kindCategory =
        item.kind != null
          ? `\n      <category domain="kind">${escapeXml(item.kind)}</category>`
          : "";
      const author =
        item.author != null && item.author !== ""
          ? `\n      <author>${escapeXml(item.author)}</author>`
          : "";

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${toRfc822(item.pubDate)}</pubDate>${author}${category}${kindCategory}${metricsCategory}
      <description>${escapeXml(item.description)}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(description)}</description>
    <language>zh-Hant</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${itemXml}
  </channel>
</rss>
`;
}
