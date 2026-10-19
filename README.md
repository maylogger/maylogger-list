# maylogger-list

把網址指定的 X List、X User 與 RSS 2.0 feed 混合成 Markdown feed。各來源對等，依時間排序，來源會標在每筆項目的 `category`。

## 快速開始

```bash
pnpm install
# 若使用 X List 或 X User，編輯 .env.local 並填入 X_BEARER_TOKEN
pnpm dev
```

- Markdown：http://localhost:3000/feed.md（需帶 `listId`、`userId` 或 `feedUrl`）

## 查詢參數

| 參數      | 說明                                                |
| --------- | --------------------------------------------------- |
| `listId`  | X List ID（純數字）                                 |
| `userId`  | X User ID（純數字）                                 |
| `feedUrl` | RSS 2.0 feed 的 HTTPS URL（需進行 URL 編碼）        |
| `token`   | 若有設定 `FEED_SECRET`，需帶上密鑰                  |
| `range`   | 過去 N 小時（正整數 `1`–`168`）。未帶則不依時間篩選 |

`listId`、`userId` 與 `feedUrl` 至少要提供一個，也可以同時提供。

範例：

- `/feed.md?listId=1687536262859849728` — 僅抓取 X List
- `/feed.md?userId=44196397` — 僅抓取指定 X User
- `/feed.md?feedUrl=https%3A%2F%2Fsidebar.io%2Ffeed.xml` — 僅抓取 RSS
- `/feed.md?listId=1687536262859849728&feedUrl=https%3A%2F%2Fsidebar.io%2Ffeed.xml` — 合併兩個來源
- `/feed.md?token=你的密鑰&listId=1687536262859849728&range=12` — 需密鑰並限制過去 12 小時

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

| 變數             | 必填                     | 說明                                 |
| ---------------- | ------------------------ | ------------------------------------ |
| `X_BEARER_TOKEN` | 使用 X List 或 X User 時 | X API Bearer Token                   |
| `FEED_SECRET`    | 否                       | 設定後需以 `/feed.md?token=...` 存取 |

## 來源

- X List：以 `listId` 查詢參數指定。
- X User：以 `userId` 查詢參數指定。
- RSS 2.0：以 URL 編碼後的 `feedUrl` 查詢參數指定；僅接受 HTTPS。
- 未提供任何來源或參數格式錯誤時回傳 `400`。

## 技術備註

- Route：`app/feed.md/route.ts`
- 共用抓取／篩選：`lib/feed-route.ts`；RSS 2.0 解析：`lib/sidebar.ts`；Markdown 組裝：`lib/markdown-feed.ts`（RSS HTML description 以 `node-html-markdown` 轉換）
- X 來源會展開 `attachments.media_keys`，把圖片／影片預覽寫進 feed；Markdown 用硬換行與 `![]()`
- 多來源以 `Promise.allSettled` 並行抓取；其中一個來源失敗時降級，所有指定來源都失敗才回傳 `502`
- 預設快取 5 分鐘（`revalidate = 300`），降低 RSS 客戶端重複請求造成的 API 費用
