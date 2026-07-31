import { buildRssFeed, type FeedItem } from "@/lib/rss";
import { getSidebarItems } from "@/lib/sidebar";
import { getListTweets, tweetsToFeedItems, X_LIST_ID } from "@/lib/x";

export const revalidate = 300;

const MAX_RANGE_HOURS = 168;

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

function isAuthorized(request: Request) {
  const secret = process.env.FEED_SECRET;
  // 未設定 FEED_SECRET 時允許直接讀（方便本機開發）
  if (!secret) return true;

  const token = new URL(request.url).searchParams.get("token");
  return token === secret;
}

/** 解析 ?range=N（過去 N 小時）。null = 不篩選；非法則丟錯 */
function parseRangeHours(searchParams: URLSearchParams): number | null {
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const url = new URL(request.url);

  let rangeHours: number | null;
  try {
    rangeHours = parseRangeHours(url.searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "無效的 range 參數";
    return new Response(message, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const [xResult, sidebarResult] = await Promise.allSettled([
    getListTweets(X_LIST_ID).then(tweetsToFeedItems),
    getSidebarItems(),
  ]);

  const items: FeedItem[] = [];
  if (xResult.status === "fulfilled") items.push(...xResult.value);
  if (sidebarResult.status === "fulfilled") items.push(...sidebarResult.value);

  if (items.length === 0 && xResult.status === "rejected" && sidebarResult.status === "rejected") {
    const details = [settleErrorMessage(xResult, "X"), settleErrorMessage(sidebarResult, "Sidebar")]
      .filter(Boolean)
      .join("；");
    return new Response(`RSS 產生失敗：${details}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  const filtered = filterByRange(items, rangeHours);

  const origin = url.origin;
  const xml = buildRssFeed({
    title: "maylogger-list",
    description: "混合 X List 與 Sidebar 的對等 RSS feed",
    link: origin,
    feedUrl: url.toString(),
    items: filtered,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
