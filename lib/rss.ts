export type FeedItem = {
  title: string;
  link: string;
  guid: string;
  /** ISO 8601 或可被 Date 解析的時間字串 */
  pubDate: string;
  description: string;
  author?: string;
  category?: string;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
      const author =
        item.author != null && item.author !== ""
          ? `\n      <author>${escapeXml(item.author)}</author>`
          : "";

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${toRfc822(item.pubDate)}</pubDate>${author}${category}
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
