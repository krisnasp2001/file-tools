import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/tools/pdf-editor-dev/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
