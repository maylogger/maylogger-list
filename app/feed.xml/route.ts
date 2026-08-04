import { gatherFeedItems, isAuthorized, parseRangeHours, unauthorized } from "@/lib/feed-route";
import { buildRssFeed } from "@/lib/rss";

export const revalidate = 300;

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

  const result = await gatherFeedItems(rangeHours);
  if (!result.ok) {
    return new Response(`RSS 產生失敗：${result.error}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const origin = url.origin;
  const xml = buildRssFeed({
    title: "maylogger-list",
    description: "混合 X List 與 Sidebar 的對等 RSS feed",
    link: origin,
    feedUrl: url.toString(),
    items: result.items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
