import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // TypeScript 7 沒有 JS Compiler API；改以專案內 tsc CLI 做 build 型別檢查
  experimental: {
    useTypeScriptCli: true,
  },
};

export default nextConfig;
