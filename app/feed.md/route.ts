import {
  type FeedSources,
  gatherFeedItems,
  isAuthorized,
  parseFeedSources,
  parseRangeHours,
  unauthorized,
} from "@/lib/feed-route";
import { buildMarkdownFeed } from "@/lib/markdown-feed";

export const revalidate = 300;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const url = new URL(request.url);

  let sources: FeedSources;
  let rangeHours: number | null;
  try {
    sources = parseFeedSources(url.searchParams);
    rangeHours = parseRangeHours(url.searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "無效的查詢參數";
    return new Response(message, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const result = await gatherFeedItems(sources, rangeHours);
  if (!result.ok) {
    return new Response(`Markdown feed 產生失敗：${result.error}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const markdown = buildMarkdownFeed({
    title: "maylogger-list",
    ...sources,
    rangeHours,
    items: result.items,
  });

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
