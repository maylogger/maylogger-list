import type { MetadataRoute } from "next";

/** 禁止所有搜尋引擎與爬蟲索引／抓取此站 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
