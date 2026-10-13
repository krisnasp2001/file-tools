import type { Metadata } from "next";
import { FeedbackClient } from "@/components/feedback/FeedbackClient";

export const metadata: Metadata = {
  title: "Feedback",
  description:
    "Share feedback, report a bug, or suggest improvements for File Tools. Your input helps make the project better.",
  alternates: {
    canonical: "/feedback",
  },
  openGraph: {
    title: "Feedback | File Tools",
    description:
      "Share feedback, report a bug, or suggest improvements for File Tools. Your input helps make the project better.",
    url: "/feedback",
  },
};

export default function FeedbackPage() {
  return <FeedbackClient />;
}
