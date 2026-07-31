<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Toolchain

- Use pnpm only.
- Use the Next.js App Router.
- Keep application code at the project root (`app/`, `components/`, `lib/`), not under `src/`.
- Use TypeScript with strict type checking.
- Use React Server Components by default.
- Add `"use client"` only when browser state, effects, events, or client-only APIs are required.
- Use the React Compiler; do not add manual memoization without a measured reason.
- Use Tailwind CSS v4.
- Use shadcn/ui components as locally owned source code.
- Use `cn()` from `@/lib/utils` for conditional class names.
- Use Oxlint for linting.
- Use Oxfmt for formatting, import sorting, and Tailwind class sorting.
- Do not add ESLint, Prettier, Biome, Babel, or custom Webpack configuration.
- Use Ladle for isolated React component development.
- Keep Ladle stories next to their components using `*.stories.tsx`.
- Run `pnpm check` and `pnpm build` before completing code changes.

## 讀取本專案 feed

- **不要用 WebFetch 讀 `/feed.xml`**：Cursor WebFetch 對 RSS/XML 常回 500／timeout。
- **請讀 `/feed.json`**（相同 `token` / `range` 參數），或用 Shell `curl` 抓 XML。
- 生產環境若設定了 `FEED_SECRET`，URL 必須帶 `?token=…`。
