import { NodeHtmlMarkdown } from "node-html-markdown";

import { formatMetricsFields, type FeedItem, type FeedMedia } from "@/lib/rss";

const nhm = new NodeHtmlMarkdown({
  keepDataImages: false,
});

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/**
 * 純文字換行 → Markdown 可見斷行。
 * 連續空行保留段落；單行換行改成兩個 trailing spaces（hard break）。
 */
export function plainTextToMarkdown(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trimEnd())
        .join("  \n"),
    )
    .join("\n\n");
}

/** description 可能是 HTML（Sidebar）或純文字（X） */
export function descriptionToMarkdown(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return nhm.translate(trimmed).trim();

  // X 的 kind/metrics 標頭維持原樣，只對正文做硬換行
  const separator = trimmed.indexOf("\n\n");
  if (separator === -1) return plainTextToMarkdown(trimmed);

  const header = trimmed.slice(0, separator);
  const body = trimmed.slice(separator + 2).trim();
  if (!body) return header;
  return `${header}\n\n${plainTextToMarkdown(body)}`;
}

function mediaToMarkdown(media: FeedMedia[]): string {
  return media
    .map((item) => {
      const alt = (item.alt ?? item.type).replaceAll(/[[\]]/g, "");
      if (item.type === "photo" || item.type === "animated_gif") {
        return `![${alt}](${item.url})`;
      }
      const preview = item.previewUrl ?? item.url;
      return `[![${alt}](${preview})](${item.url})`;
    })
    .join("\n");
}

function formatItem(item: FeedItem): string {
  const meta: string[] = [
    `- link: ${item.link}`,
    `- pubDate: ${new Date(item.pubDate).toISOString()}`,
  ];

  if (item.author) meta.push(`- author: ${item.author}`);
  if (item.category) meta.push(`- category: ${item.category}`);
  if (item.kind) meta.push(`- kind: ${item.kind}`);
  if (item.metrics) meta.push(`- metrics: ${formatMetricsFields(item.metrics)}`);

  const body = descriptionToMarkdown(item.description);
  const mediaBlock = item.media?.length ? mediaToMarkdown(item.media) : "";
  const parts = [`## ${item.title}`, "", ...meta];
  if (body) {
    parts.push("", body);
  }
  if (mediaBlock) {
    parts.push("", mediaBlock);
  }
  return parts.join("\n");
}

interface MarkdownFeedOptions {
  title: string;
  listId?: string;
  userId?: string;
  feedUrl?: string;
  rangeHours: number | null;
  items: FeedItem[];
}

/** 把 FeedItem 與實際查詢條件轉成給人／agent 閱讀的 Markdown feed */
export function buildMarkdownFeed(options: MarkdownFeedOptions) {
  const { title, listId, userId, feedUrl, rangeHours, items } = options;
  const sourceLines: string[] = [];
  if (userId) sourceLines.push(`- userId=${userId}`);
  if (listId) sourceLines.push(`- listId=${listId}`);
  if (feedUrl) sourceLines.push(`- feed=${feedUrl}`);

  const header = [
    `# ${title}`,
    "",
    ...sourceLines,
    `- range ${rangeHours == null ? "不限時間" : `${rangeHours} 小時內`}`,
    "",
    "---",
  ];

  if (items.length === 0) {
    return `${header.join("\n")}\n\n_目前沒有符合條件的項目。_\n`;
  }

  const body = items.map((item) => formatItem(item)).join("\n\n---\n\n");
  return `${header.join("\n")}\n\n${body}\n`;
}
