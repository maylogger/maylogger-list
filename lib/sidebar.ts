import { XMLParser } from "fast-xml-parser";

import type { FeedItem } from "@/lib/rss";

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
      title?: RssText;
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

/** 抓取 RSS 2.0 feed 並轉成 FeedItem */
export async function getRssFeedItems(feedUrl: string, maxResults = 50): Promise<FeedItem[]> {
  const res = await fetch(feedUrl, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`RSS 請求失敗（${res.status}）`);
  }

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "#text",
    trimValues: true,
  });
  const parsed = parser.parse(xml) as SidebarRss;
  const channel = parsed.rss?.channel;
  if (channel == null) {
    throw new Error("RSS 格式無效：找不到 rss.channel");
  }

  const category = textOf(channel.title) || new URL(feedUrl).hostname;
  const rawItems = asItemArray(channel.item);

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
        category,
      };
      if (author) feedItem.author = author;
      return feedItem;
    })
    .filter((item): item is FeedItem => item != null)
    .slice(0, maxResults);
}
