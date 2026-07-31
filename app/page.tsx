import Link from "next/link";

import { X_LIST_ID } from "@/lib/x";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">x-list</p>
        <h1 className="text-3xl font-semibold tracking-tight">X List → RSS Feed</h1>
        <p className="text-muted-foreground">
          把固定的 X List 轉成可訂閱的 RSS。List ID 已寫死為{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{X_LIST_ID}</code>。
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Feed 網址</h2>
        <code className="rounded-lg bg-muted px-3 py-2 text-sm break-all">/feed.xml</code>
        <p className="text-sm text-muted-foreground">
          若有設定 <code>FEED_SECRET</code>，請用{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">/feed.xml?token=你的密鑰</code>。
        </p>
        <Link href="/feed.xml" className="text-sm font-medium underline underline-offset-4">
          開啟 RSS
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">X Developer Console 設定</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            前往{" "}
            <a
              href="https://developer.x.com"
              className="text-foreground underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              developer.x.com
            </a>{" "}
            建立 Project / App（或使用既有 App）。
          </li>
          <li>
            在 App 的 <strong className="text-foreground">Keys and tokens</strong> 產生 / 複製{" "}
            <strong className="text-foreground">Bearer Token</strong>。
          </li>
          <li>確認帳號已充值可用額度（目前 X API 多為 pay-per-use；讀取貼文會計費）。</li>
          <li>
            複製 <code className="rounded bg-muted px-1.5 py-0.5">.env.example</code> 為{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code>
            ，填入 <code className="rounded bg-muted px-1.5 py-0.5">X_BEARER_TOKEN</code>。
          </li>
          <li>
            執行 <code className="rounded bg-muted px-1.5 py-0.5">pnpm dev</code>
            ，用 RSS 閱讀器訂閱{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">http://localhost:3000/feed.xml</code>。
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          原始 List：{" "}
          <a
            href={`https://x.com/i/lists/${X_LIST_ID}`}
            className="text-foreground underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            x.com/i/lists/{X_LIST_ID}
          </a>
        </p>
        <p>API：`GET /2/lists/:id/tweets`（App-only Bearer Token）</p>
      </section>
    </main>
  );
}
