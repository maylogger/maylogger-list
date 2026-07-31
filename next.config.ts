import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // TypeScript 7 沒有 JS Compiler API；改以專案內 tsc CLI 做 build 型別檢查
  experimental: {
    useTypeScriptCli: true,
  },
  // 回應層再標一次，補強 robots.txt（涵蓋 /feed.xml 等）
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
