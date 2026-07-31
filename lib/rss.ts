import type { XTweet } from "@/lib/x";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function tweetUrl(tweet: XTweet) {
  const username = tweet.author?.username ?? "i";
  return `https://x.com/${username}/status/${tweet.id}`;
}

function itemTitle(tweet: XTweet) {
  const author = tweet.author ? `${tweet.author.name} (@${tweet.author.username})` : "X";
  const preview = tweet.text.replaceAll(/\s+/g, " ").trim();
  const short = preview.length > 80 ? `${preview.slice(0, 77).trimEnd()}…` : preview;
  return `${author}: ${short}`;
}

function toRfc822(iso: string) {
  return new Date(iso).toUTCString();
}

export function buildRssFeed(options: {
  title: string;
  description: string;
  link: string;
  feedUrl: string;
  tweets: XTweet[];
}) {
  const { title, description, link, feedUrl, tweets } = options;
  const lastBuildDate =
    tweets[0]?.created_at != null ? toRfc822(tweets[0].created_at) : new Date().toUTCString();

  const items = tweets
    .map((tweet) => {
      const url = tweetUrl(tweet);
      const author = tweet.author ? `${tweet.author.name} (@${tweet.author.username})` : "X";

      return `    <item>
      <title>${escapeXml(itemTitle(tweet))}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${toRfc822(tweet.created_at)}</pubDate>
      <author>${escapeXml(author)}</author>
      <description>${escapeXml(tweet.text)}</description>
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
${items}
  </channel>
</rss>
`;
}
