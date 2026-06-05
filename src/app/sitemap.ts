import type { MetadataRoute } from "next";

const routes = ["", "/ht101", "/projects", "/real-estate", "/book", "/about"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://angli.site${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
