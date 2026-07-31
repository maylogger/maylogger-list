# x-list

把固定的 [X List](https://x.com/i/lists/1687536262859849728) 轉成可自己訂閱的 RSS feed。

以 [sota.design.2027](https://github.com/maylogger/sota.design.2027) Next.js template 為底。

## 快速開始

```bash
pnpm install
cp .env.example .env.local
# 編輯 .env.local，填入 X_BEARER_TOKEN
pnpm dev
```

- 首頁：http://localhost:3000
- RSS：http://localhost:3000/feed.xml

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

## 寫死的 List

`lib/x.ts` 內的 `X_LIST_ID = "1687536262859849728"`。

## 技術備註

- Route：`app/feed.xml/route.ts`
- 呼叫：`GET https://api.x.com/2/lists/:id/tweets`
- 預設快取 5 分鐘（`revalidate = 300`），降低 RSS 客戶端重複請求造成的 API 費用
