import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: {
    absolute: "File Tools - Free Browser-Based File Utilities",
  },
  description: SITE_CONFIG.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "File Tools - Free Browser-Based File Utilities",
    description: SITE_CONFIG.description,
    url: "/",
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
