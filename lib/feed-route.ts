import type { FeedItem } from "@/lib/rss";
import { getRssFeedItems } from "@/lib/sidebar";
import { getListTweets, getUserTweets, tweetsToFeedItems } from "@/lib/x";

const MAX_RANGE_HOURS = 168;

export interface FeedSources {
  listId?: string;
  userId?: string;
  feedUrl?: string;
}

export function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

export function isAuthorized(request: Request) {
  const secret = process.env.FEED_SECRET;
  // 未設定 FEED_SECRET 時允許直接讀（方便本機開發）
  if (!secret) return true;

  const token = new URL(request.url).searchParams.get("token");
  return token === secret;
}

/** 解析動態來源；至少需要一個來源，且外部 RSS 僅允許 HTTPS */
export function parseFeedSources(searchParams: URLSearchParams): FeedSources {
  const listId = searchParams.get("listId")?.trim() ?? "";
  const userId = searchParams.get("userId")?.trim() ?? "";
  const rawFeedUrl = searchParams.get("feedUrl")?.trim() ?? "";

  if (listId && !/^\d+$/.test(listId)) {
    throw new Error("listId 必須是純數字的 X List ID");
  }
  if (userId && !/^\d+$/.test(userId)) {
    throw new Error("userId 必須是純數字的 X User ID");
  }

  let feedUrl = "";
  if (rawFeedUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawFeedUrl);
    } catch {
      throw new Error("feedUrl 必須是有效的 HTTPS URL");
    }

    if (parsedUrl.protocol !== "https:") {
      throw new Error("feedUrl 僅支援 HTTPS URL");
    }
    feedUrl = parsedUrl.toString();
  }

  if (!listId && !userId && !feedUrl) {
    throw new Error("至少需要提供 listId、userId 或 feedUrl");
  }

  return {
    ...(listId ? { listId } : {}),
    ...(userId ? { userId } : {}),
    ...(feedUrl ? { feedUrl } : {}),
  };
}

/** 解析 ?range=N（過去 N 小時）。null = 不篩選；非法則丟錯 */
export function parseRangeHours(searchParams: URLSearchParams): number | null {
  const raw = searchParams.get("range");
  if (raw == null || raw === "") return null;

  if (!/^\d+$/.test(raw)) {
    throw new Error(`range 必須是 1–${MAX_RANGE_HOURS} 的正整數，例如 ?range=3`);
  }

  const hours = Number(raw);
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_RANGE_HOURS) {
    throw new Error(`range 必須是 1–${MAX_RANGE_HOURS} 的正整數，例如 ?range=3`);
  }

  return hours;
}

function filterByRange(items: FeedItem[], rangeHours: number | null): FeedItem[] {
  if (rangeHours == null) return items;
  const cutoff = Date.now() - rangeHours * 3_600_000;
  return items.filter((item) => {
    const time = new Date(item.pubDate).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
}

function settleErrorMessage(result: PromiseSettledResult<unknown>, label: string): string {
  if (result.status === "fulfilled") return "";
  const reason = result.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  return `${label}: ${message}`;
}

export type FeedGatherResult = { ok: true; items: FeedItem[] } | { ok: false; error: string };

/** 抓取指定來源、合併、排序、依 range 篩選 */
export async function gatherFeedItems(
  sources: FeedSources,
  rangeHours: number | null,
): Promise<FeedGatherResult> {
  const requests: Array<{ label: string; promise: Promise<FeedItem[]> }> = [];
  if (sources.listId) {
    requests.push({
      label: "X List",
      promise: getListTweets(sources.listId).then(tweetsToFeedItems),
    });
  }
  if (sources.userId) {
    requests.push({
      label: "X User",
      promise: getUserTweets(sources.userId).then(tweetsToFeedItems),
    });
  }
  if (sources.feedUrl) {
    requests.push({
      label: "RSS",
      promise: getRssFeedItems(sources.feedUrl),
    });
  }

  const results = await Promise.allSettled(requests.map(({ promise }) => promise));
  const items: FeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") items.push(...result.value);
  }

  if (results.every((result) => result.status === "rejected")) {
    const details = results
      .map((result, index) => settleErrorMessage(result, requests[index]!.label))
      .filter(Boolean)
      .join("；");
    return { ok: false, error: details };
  }

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return { ok: true, items: filterByRange(items, rangeHours) };
}
