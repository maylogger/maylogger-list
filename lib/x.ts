import {
  formatKindLine,
  formatMetricsLine,
  type FeedItem,
  type FeedMedia,
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

type XUrlEntity = {
  start: number;
  end: number;
  url: string;
  expanded_url?: string;
  display_url?: string;
  media_key?: string;
};

type XEntities = {
  urls?: XUrlEntity[];
};

type XAttachments = {
  media_keys?: string[];
};

export type XMedia = {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
};

export type XTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  author?: XUser;
  public_metrics?: XPublicMetrics;
  referenced_tweets?: XReferencedTweet[];
  entities?: XEntities;
  attachments?: XAttachments;
  media?: XMedia[];
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
  entities?: XEntities;
  attachments?: XAttachments;
};

function tweetUrl(tweet: XTweet) {
  const username = tweet.author?.username ?? "i";
  return `https://x.com/${username}/status/${tweet.id}`;
}

function tweetTitle(tweet: XTweet) {
  const author = tweet.author ? `${tweet.author.name} (@${tweet.author.username})` : "X";
  const preview = displayTweetText(tweet).replaceAll(/\s+/g, " ").trim();
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

/** RT 取原文媒體；其餘取本則 */
function resolveMedia(tweet: XTweet): XMedia[] {
  const kind = getPostKind(tweet);
  if (kind === "retweet" && tweet.referenced != null) {
    return tweet.referenced.media ?? [];
  }
  return tweet.media ?? [];
}

function toFeedMedia(media: XMedia[]): FeedMedia[] {
  return media
    .map((item) => {
      const url = item.url ?? item.preview_image_url;
      if (!url) return null;
      const feedMedia: FeedMedia = {
        url,
        type: item.type,
      };
      if (item.preview_image_url && item.preview_image_url !== url) {
        feedMedia.previewUrl = item.preview_image_url;
      }
      if (item.alt_text) feedMedia.alt = item.alt_text;
      return feedMedia;
    })
    .filter((item): item is FeedMedia => item != null);
}

/**
 * 展開一般連結、移除結尾的媒體 t.co（改由 media 欄位提供實際網址）。
 * 由後往前替換，避免 offset 錯位。
 */
export function displayTweetText(tweet: Pick<XTweet, "text" | "entities">): string {
  const urls = (tweet.entities?.urls ?? []).toSorted((a, b) => b.start - a.start);
  let text = tweet.text;

  for (const entity of urls) {
    const before = text.slice(0, entity.start);
    const after = text.slice(entity.end);

    if (entity.media_key) {
      // 媒體短連結通常掛在文末，去掉即可
      text = `${before.trimEnd()}${after}`;
      continue;
    }

    const replacement = entity.expanded_url ?? entity.url;
    text = `${before}${replacement}${after}`;
  }

  return text.replaceAll(/[ \t]+\n/g, "\n").trimEnd();
}

function tweetDescription(tweet: XTweet, kind: FeedPostKind, metrics?: FeedMetrics): string {
  const lines = [formatKindLine(kind)];
  if (metrics != null) {
    lines.push(formatMetricsLine(metrics));
  }
  return `${lines.join("\n")}\n\n${displayTweetText(tweet)}`;
}

/** 把 X 貼文轉成中立 FeedItem */
export function tweetsToFeedItems(tweets: XTweet[]): FeedItem[] {
  return tweets.map((tweet) => {
    const url = tweetUrl(tweet);
    const author = tweet.author ? `${tweet.author.name} (@${tweet.author.username})` : "X";
    const kind = getPostKind(tweet);
    const metrics = resolveMetrics(tweet);
    const media = toFeedMedia(resolveMedia(tweet));

    const item: FeedItem = {
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
    if (media.length > 0) item.media = media;
    return item;
  });
}

type XListTweetsResponse = {
  data?: XTweetPayload[];
  includes?: {
    users?: XUser[];
    tweets?: XTweetPayload[];
    media?: XMedia[];
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

function attachMedia(payload: XTweetPayload, mediaByKey: Map<string, XMedia>): XMedia[] {
  const keys = payload.attachments?.media_keys ?? [];
  return keys.map((key) => mediaByKey.get(key)).filter((item): item is XMedia => item != null);
}

function hydrateTweet(
  payload: XTweetPayload,
  users: Map<string, XUser>,
  referencedTweets: Map<string, XTweetPayload>,
  mediaByKey: Map<string, XMedia>,
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
    entities: payload.entities,
    attachments: payload.attachments,
    media: attachMedia(payload, mediaByKey),
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
            entities: referencedPayload.entities,
            attachments: referencedPayload.attachments,
            media: attachMedia(referencedPayload, mediaByKey),
          }
        : undefined,
  };
}

/** 取得 List 最近貼文 */
export async function getListTweets(listId = X_LIST_ID, maxResults = 50): Promise<XTweet[]> {
  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(maxResults, 1), 100)),
    "tweet.fields": "created_at,author_id,public_metrics,referenced_tweets,attachments,entities",
    // referenced 貼文的 media_keys 也會進 includes.media（搭配 attachments.media_keys）
    expansions: "author_id,referenced_tweets.id,referenced_tweets.author_id,attachments.media_keys",
    "user.fields": "name,username",
    "media.fields": "url,preview_image_url,type,alt_text,width,height",
  });

  const data = await xFetch<XListTweetsResponse>(`/lists/${listId}/tweets?${params}`);

  const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));
  const referencedTweets = new Map((data.includes?.tweets ?? []).map((t) => [t.id, t]));
  const mediaByKey = new Map((data.includes?.media ?? []).map((m) => [m.media_key, m]));

  return (data.data ?? []).map((tweet) => hydrateTweet(tweet, users, referencedTweets, mediaByKey));
}
