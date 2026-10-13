import type { Metadata } from "next";
import { DonateClient } from "@/components/donate/DonateClient";

export const metadata: Metadata = {
  title: "Support",
  description:
    "File Tools is free to use and always will be. If you find it useful, consider supporting the project to keep it running and growing.",
  alternates: {
    canonical: "/donate",
  },
  openGraph: {
    title: "Support | File Tools",
    description:
      "File Tools is free to use and always will be. If you find it useful, consider supporting the project to keep it running and growing.",
    url: "/donate",
  },
};

export default function DonatePage() {
  return <DonateClient />;
}
