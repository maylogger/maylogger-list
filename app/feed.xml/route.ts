import { filterByRange, gatherFeedItems, isFeedAuthorized, parseRangeHours } from "@/lib/feed";
import { buildRssFeed } from "@/lib/rss";

export const revalidate = 300;

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

export async function GET(request: Request) {
  if (!isFeedAuthorized(request)) {
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

  const { items, failure } = await gatherFeedItems();

  if (failure != null) {
    return new Response(`RSS 產生失敗：${failure}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

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
