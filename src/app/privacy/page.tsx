import type { Metadata } from "next";
import { PrivacyClient } from "@/components/privacy/PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how File Tools protects your data with local client-side browser file processing and transparent handling.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | File Tools",
    description:
      "Learn how File Tools protects your data with local client-side browser file processing and transparent handling.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
