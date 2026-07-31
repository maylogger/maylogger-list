/** 寫死要訂閱的 X List ID */
export const X_LIST_ID = "1687536262859849728";

export type XUser = {
  id: string;
  name: string;
  username: string;
};

export type XTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  author?: XUser;
};

type XListTweetsResponse = {
  data?: Array<{
    id: string;
    text: string;
    created_at: string;
    author_id: string;
  }>;
  includes?: {
    users?: XUser[];
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

/** 取得 List 最近貼文 */
export async function getListTweets(listId = X_LIST_ID, maxResults = 50): Promise<XTweet[]> {
  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(maxResults, 1), 100)),
    "tweet.fields": "created_at,author_id",
    expansions: "author_id",
    "user.fields": "name,username",
  });

  const data = await xFetch<XListTweetsResponse>(`/lists/${listId}/tweets?${params}`);

  const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));

  return (data.data ?? []).map((tweet) => {
    const item: XTweet = {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      author_id: tweet.author_id,
      author: users.get(tweet.author_id),
    };
    return item;
  });
}
