import { isAuthorized, unauthorized } from "@/lib/feed-route";
import { buildProfileMarkdown, type ProfileResult } from "@/lib/markdown-profile";
import { getXUserProfile } from "@/lib/x";
import { getYouTubeProfile } from "@/lib/youtube";

export const revalidate = 300;

interface ProfileSources {
  userId?: string;
  youtubeUserId?: string;
}

function parseProfileSources(searchParams: URLSearchParams): ProfileSources {
  const userId = searchParams.get("userId")?.trim() ?? "";
  const youtubeUserId =
    searchParams.get("youtubeUserId")?.trim() ?? searchParams.get("ytUserId")?.trim() ?? "";

  if (userId && !/^\d+$/.test(userId)) {
    throw new Error("userId 必須是純數字的 X User ID");
  }
  if (youtubeUserId && !/^UC[\w-]{22}$/.test(youtubeUserId)) {
    throw new Error("youtubeUserId 必須是以 UC 開頭、共 24 字元的 YouTube Channel ID");
  }
  if (!userId && !youtubeUserId) {
    throw new Error("至少需要提供 userId 或 youtubeUserId");
  }

  return {
    ...(userId ? { userId } : {}),
    ...(youtubeUserId ? { youtubeUserId } : {}),
  };
}

function errorMessage(result: PromiseSettledResult<ProfileResult>, label: string) {
  if (result.status === "fulfilled") return "";
  const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
  return `${label}：${message}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  let sources: ProfileSources;
  try {
    sources = parseProfileSources(new URL(request.url).searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "無效的查詢參數";
    return new Response(message, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const requests: Array<{ label: string; promise: Promise<ProfileResult> }> = [];
  if (sources.userId) {
    requests.push({
      label: "X",
      promise: getXUserProfile(sources.userId).then((profile) => ({ platform: "X", profile })),
    });
  }
  if (sources.youtubeUserId) {
    requests.push({
      label: "YouTube",
      promise: getYouTubeProfile(sources.youtubeUserId).then((profile) => ({
        platform: "YouTube",
        profile,
      })),
    });
  }

  const settled = await Promise.allSettled(requests.map(({ promise }) => promise));
  const results = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const errors = settled
    .map((result, index) => errorMessage(result, requests[index]!.label))
    .filter(Boolean);

  if (results.length === 0) {
    return new Response(`Profile 查詢失敗：${errors.join("；")}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(buildProfileMarkdown(results, errors), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
