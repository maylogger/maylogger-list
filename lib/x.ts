import {
  formatKindLine,
  formatMetricsLine,
  type FeedItem,
  type FeedMetrics,
  type FeedPostKind,
} from "@/lib/rss";

/** 寫死要訂閱的 X List ID */
export const X_LIST_ID = "1687536262859849728";

export type XUser = {
  id: string;
  name: string;
  username: string;
};

/** X API public_metrics */
export type XPublicMetrics = {
  like_count: number;
  reply_count: number;
  retweet_count: number;
  quote_count: number;
  bookmark_count?: number;
  impression_count?: number;
};

export type XReferencedTweet = {
  type: "retweeted" | "quoted" | "replied_to";
  id: string;
};

export type XTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  author?: XUser;
  public_metrics?: XPublicMetrics;
  referenced_tweets?: XReferencedTweet[];
  /** 被引用／轉發的原文（來自 expansions） */
  referenced?: XTweet;
};

type XTweetPayload = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: XPublicMetrics;
  referenced_tweets?: XReferencedTweet[];
};

function tweetUrl(tweet: XTweet) {
  const username = tweet.author?.username ?? "i";
  return `https://x.com/${username}/status/${tweet.id}`;
}

function tweetTitle(tweet: XTweet) {
  const author = tweet.author ? `${tweet.author.name} (@${tweet.author.username})` : "X";
  const preview = tweet.text.replaceAll(/\s+/g, " ").trim();
  const short = preview.length > 80 ? `${preview.slice(0, 77).trimEnd()}…` : preview;
  const kind = getPostKind(tweet);
  const prefix = kind === "retweet" ? "[RT] " : kind === "quote" ? "[QT] " : "";
  return `${prefix}${author}: ${short}`;
}

function toFeedMetrics(metrics: XPublicMetrics): FeedMetrics {
  const result: FeedMetrics = {
    likes: metrics.like_count,
    replies: metrics.reply_count,
    retweets: metrics.retweet_count,
    quotes: metrics.quote_count,
  };

  if (metrics.bookmark_count != null) {
    result.bookmarks = metrics.bookmark_count;
  }
  if (metrics.impression_count != null) {
    result.impressions = metrics.impression_count;
  }

  return result;
}

/** 依 referenced_tweets 判斷貼文型態；優先順序 RT > quote > reply */
export function getPostKind(tweet: Pick<XTweet, "referenced_tweets">): FeedPostKind {
  const refs = tweet.referenced_tweets ?? [];
  if (refs.some((ref) => ref.type === "retweeted")) return "retweet";
  if (refs.some((ref) => ref.type === "quoted")) return "quote";
  if (refs.some((ref) => ref.type === "replied_to")) return "reply";
  return "original";
}

/** RT 本身的 metrics 通常無參考價值，改取原文 */
function resolveMetrics(tweet: XTweet): FeedMetrics | undefined {
  const kind = getPostKind(tweet);
  const source =
    kind === "retweet" && tweet.referenced?.public_metrics != null
      ? tweet.referenced.public_metrics
      : tweet.public_metrics;

  return source != null ? toFeedMetrics(source) : undefined;
}

function tweetDescription(tweet: XTweet, kind: FeedPostKind, metrics?: FeedMetrics): string {
  const lines = [formatKindLine(kind)];
  if (metrics != null) {
    lines.push(formatMetricsLine(metrics));
  }
  return `${lines.join("\n")}\n\n${tweet.text}`;
}

/** 把 X 貼文轉成中立 FeedItem */
export function tweetsToFeedItems(tweets: XTweet[]): FeedItem[] {
  return tweets.map((tweet) => {
    const url = tweetUrl(tweet);
    const author = tweet.author ? `${tweet.author.name} (@${tweet.author.username})` : "X";
    const kind = getPostKind(tweet);
    const metrics = resolveMetrics(tweet);

    return {
      title: tweetTitle(tweet),
      link: url,
      guid: url,
      pubDate: tweet.created_at,
      description: tweetDescription(tweet, kind, metrics),
      author,
      category: "X",
      metrics,
      kind,
    };
  });
}

type XListTweetsResponse = {
  data?: XTweetPayload[];
  includes?: {
    users?: XUser[];
    tweets?: XTweetPayload[];
  };
  meta?: {
    result_count?: number;
    next_token?: string;
  };
  errors?: Array<{ detail?: string; title?: string }>;
};

type XListResponse = {
  data?: {
    id: string;
    name: string;
    description?: string;
  };
  errors?: Array<{ detail?: string; title?: string }>;
};

function getBearerToken() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error("缺少 X_BEARER_TOKEN，請先在 .env.local 設定。");
  }
  return token;
}

async function xFetch<T>(path: string): Promise<T> {
  const url = `https://api.x.com/2${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getBearerToken()}`,
    },
    // 快取 5 分鐘，避免 RSS 客戶端頻繁抓取耗盡額度
    next: { revalidate: 300 },
  });

  const body = (await res.json()) as T & {
    errors?: Array<{ detail?: string; title?: string }>;
    detail?: string;
    title?: string;
  };

  if (!res.ok) {
    const message =
      body.errors?.[0]?.detail || body.detail || body.title || `X API 請求失敗（${res.status}）`;
    throw new Error(message);
  }

  return body;
}

/** 取得 List 基本資訊（標題用） */
export async function getListInfo(listId = X_LIST_ID) {
  const data = await xFetch<XListResponse>(`/lists/${listId}?list.fields=description,name`);
  return data.data ?? { id: listId, name: `X List ${listId}` };
}

function pickPrimaryReference(refs: XReferencedTweet[] | undefined): XReferencedTweet | undefined {
  if (refs == null || refs.length === 0) return undefined;
  return (
    refs.find((ref) => ref.type === "retweeted") ??
    refs.find((ref) => ref.type === "quoted") ??
    refs.find((ref) => ref.type === "replied_to") ??
    refs[0]
  );
}

function hydrateTweet(
  payload: XTweetPayload,
  users: Map<string, XUser>,
  referencedTweets: Map<string, XTweetPayload>,
): XTweet {
  const primaryRef = pickPrimaryReference(payload.referenced_tweets);
  const referencedPayload = primaryRef != null ? referencedTweets.get(primaryRef.id) : undefined;

  return {
    id: payload.id,
    text: payload.text,
    created_at: payload.created_at,
    author_id: payload.author_id,
    author: users.get(payload.author_id),
    public_metrics: payload.public_metrics,
    referenced_tweets: payload.referenced_tweets,
    referenced:
      referencedPayload != null
        ? {
            id: referencedPayload.id,
            text: referencedPayload.text,
            created_at: referencedPayload.created_at,
            author_id: referencedPayload.author_id,
            author: users.get(referencedPayload.author_id),
            public_metrics: referencedPayload.public_metrics,
            referenced_tweets: referencedPayload.referenced_tweets,
          }
        : undefined,
  };
}

/** 取得 List 最近貼文 */
export async function getListTweets(listId = X_LIST_ID, maxResults = 50): Promise<XTweet[]> {
  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(maxResults, 1), 100)),
    "tweet.fields": "created_at,author_id,public_metrics,referenced_tweets",
    expansions: "author_id,referenced_tweets.id,referenced_tweets.author_id",
    "user.fields": "name,username",
  });

  const data = await xFetch<XListTweetsResponse>(`/lists/${listId}/tweets?${params}`);

  const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));
  const referencedTweets = new Map((data.includes?.tweets ?? []).map((t) => [t.id, t]));

  return (data.data ?? []).map((tweet) => hydrateTweet(tweet, users, referencedTweets));
}
