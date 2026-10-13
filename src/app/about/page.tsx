import type { Metadata } from "next";
import { AboutClient } from "@/components/about/AboutClient";

export const metadata: Metadata = {
  title: "About",
  description:
    "File Tools is an independent, free collection of browser-based file utilities built for a simpler way to work with files.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About | File Tools",
    description:
      "File Tools is an independent, free collection of browser-based file utilities built for a simpler way to work with files.",
    url: "/about",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
