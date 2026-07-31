import { XMLParser } from "fast-xml-parser";

import type { FeedItem } from "@/lib/rss";

const SIDEBAR_FEED_URL = "https://sidebar.io/feed.xml";

type RssTextNode = string | { "#text"?: string };
type RssText = RssTextNode | RssTextNode[];

type RssItem = {
  title?: RssText;
  link?: RssText;
  guid?: RssText | { "#text"?: string; "@_isPermaLink"?: string };
  pubDate?: RssText;
  description?: RssText;
  author?: RssText;
};

type SidebarRss = {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
};

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => textOf(part))
      .join("")
      .trim();
  }
  if (typeof value === "object" && "#text" in value) {
    return String((value as { "#text"?: unknown })["#text"] ?? "").trim();
  }
  return "";
}

function asItemArray(item: RssItem | RssItem[] | undefined): RssItem[] {
  if (item == null) return [];
  return Array.isArray(item) ? item : [item];
}

/** 抓取 Sidebar RSS 並轉成 FeedItem */
export async function getSidebarItems(maxResults = 50): Promise<FeedItem[]> {
  const res = await fetch(SIDEBAR_FEED_URL, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Sidebar RSS 請求失敗（${res.status}）`);
  }

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "#text",
    trimValues: true,
  });
  const parsed = parser.parse(xml) as SidebarRss;
  const rawItems = asItemArray(parsed.rss?.channel?.item);

  return rawItems
    .map((item) => {
      const link = textOf(item.link);
      const guid = textOf(item.guid) || link;
      const title = textOf(item.title);
      const pubDate = textOf(item.pubDate);
      const description = textOf(item.description);
      const author = textOf(item.author);

      if (!title || !link || !pubDate) return null;

      const feedItem: FeedItem = {
        title,
        link,
        guid,
        pubDate,
        description,
        category: "Sidebar",
      };
      if (author) feedItem.author = author;
      return feedItem;
    })
    .filter((item): item is FeedItem => item != null)
    .slice(0, maxResults);
}
