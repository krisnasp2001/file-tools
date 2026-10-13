export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://filetools.app");

export const SITE_CONFIG = {
  name: "File Tools",
  title: "File Tools - Free Browser-Based File Utilities",
  description:
    "Convert and manage files directly in your browser. Free, fast, private, and client-side with no uploads required.",
  url: SITE_URL,
  twitterHandle: "@filetools",
};
