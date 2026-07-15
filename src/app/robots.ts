import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/ht101", "/ht101-assets/"],
    },
    sitemap: "https://angli.site/sitemap.xml",
  };
}
