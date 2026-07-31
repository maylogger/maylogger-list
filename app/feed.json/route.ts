import { filterByRange, gatherFeedItems, isFeedAuthorized, parseRangeHours } from "@/lib/feed";

export const revalidate = 300;

/**
 * Agent 友善的 JSON feed。
 * Cursor WebFetch 對 RSS/XML 常回 500，對 JSON 可正常讀取；
 * 人機訂閱仍請用 /feed.xml。
 */
export async function GET(request: Request) {
  if (!isFeedAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const url = new URL(request.url);

  let rangeHours: number | null;
  try {
    rangeHours = parseRangeHours(url.searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "無效的 range 參數";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const { items, failure } = await gatherFeedItems();

  if (failure != null) {
    return new Response(JSON.stringify({ error: `Feed 產生失敗：${failure}` }), {
      status: 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const filtered = filterByRange(items, rangeHours);

  return new Response(
    JSON.stringify(
      {
        title: "maylogger-list",
        description: "混合 X List 與 Sidebar 的對等 feed",
        link: url.origin,
        feedUrl: url.toString(),
        rangeHours,
        itemCount: filtered.length,
        items: filtered,
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    },
  );
}
