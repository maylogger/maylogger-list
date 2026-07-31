import { buildRssFeed } from "@/lib/rss";
import { getListInfo, getListTweets, X_LIST_ID } from "@/lib/x";

export const revalidate = 300;

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  try {
    const [list, tweets] = await Promise.all([getListInfo(X_LIST_ID), getListTweets(X_LIST_ID)]);

    const feedUrl = new URL(request.url).toString();
    const listLink = `https://x.com/i/lists/${X_LIST_ID}`;

    const xml = buildRssFeed({
      title: `X List: ${list.name}`,
      description: list.description || `Posts from X list ${X_LIST_ID}`,
      link: listLink,
      feedUrl,
      tweets,
    });

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    return new Response(`RSS 產生失敗：${message}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
