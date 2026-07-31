# maylogger-list

把 [X List](https://x.com/i/lists/1687536262859849728) 與 [Sidebar](https://sidebar.io/feed.xml) 混合成可訂閱的 RSS feed。兩邊對等，依時間排序；來源標在 `<category>`（`X` / `Sidebar`）。

以 [sota.design.2027](https://github.com/maylogger/sota.design.2027) Next.js template 為底。

## 快速開始

```bash
pnpm install
# 編輯 .env.local，填入 X_BEARER_TOKEN
pnpm dev
```

- RSS：http://localhost:3000/feed.xml
- JSON（給 agent）：http://localhost:3000/feed.json

## 查詢參數

| 參數    | 說明                                                                              |
| ------- | --------------------------------------------------------------------------------- |
| `token` | 若有設定 `FEED_SECRET`，需帶上密鑰                                                |
| `range` | 過去 N 小時（正整數 `1`–`168`）。例如 `?range=3`、`?range=12`。未帶則不依時間篩選 |

範例：

- `/feed.xml?range=3` — 過去 3 小時
- `/feed.xml?token=你的密鑰&range=12` — 需密鑰時併用
- `/feed.json?range=3` — 同上內容的 JSON，方便 agent 讀取

## Agent 怎麼讀這份 feed

Cursor 的 **WebFetch 不適合讀 RSS/XML**：對 `application/rss+xml` / `text/xml` 常直接回 **500**（或 timeout），這是工具限制，不是本服務壞掉。對照之下 WebFetch 讀 **JSON** 是正常的。

建議：

1. **優先用** `/feed.json?token=…&range=…`（WebFetch 或 curl 都可以）
2. 若一定要 RSS：用終端機 `curl`，不要用 WebFetch
3. 生產環境有 `FEED_SECRET` 時，沒帶 `token` 會是 **401**，記得把密鑰放進 URL

## X Developer Console

1. 開啟 [developer.x.com](https://developer.x.com)，建立或選擇 Project / App。
2. 到 App 的 **Keys and tokens**，複製 **Bearer Token**（App-only auth 即可，不需要 user OAuth）。
3. 確認帳號有可用額度（X API 目前多為 pay-per-use；每次抓 List 貼文會產生讀取費用）。
4. 把 Bearer Token 寫進 `.env.local`：

```env
X_BEARER_TOKEN=你的_bearer_token
FEED_SECRET=可選的隨機密鑰
```

## 環境變數

| 變數             | 必填 | 說明                                  |
| ---------------- | ---- | ------------------------------------- |
| `X_BEARER_TOKEN` | 是   | X API Bearer Token                    |
| `FEED_SECRET`    | 否   | 設定後需以 `/feed.xml?token=...` 存取 |

## 來源

- X List ID（寫死）：`lib/x.ts` 內 `X_LIST_ID = "1687536262859849728"`
- Sidebar：`https://sidebar.io/feed.xml`

## 技術備註

- Route：`app/feed.xml/route.ts`、`app/feed.json/route.ts`（共用 `lib/feed.ts`）
- 雙源以 `Promise.allSettled` 並行抓取；單一來源失敗會降級，兩源都失敗才 502
- 預設快取 5 分鐘（`revalidate = 300`），降低 RSS 客戶端重複請求造成的 API 費用
