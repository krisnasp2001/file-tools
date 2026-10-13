import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { I18nProvider } from "@/lib/i18n/context";
import { FeedbackNudge } from "@/components/feedback/FeedbackNudge";
import { SITE_URL, SITE_CONFIG } from "@/lib/config/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "File Tools - Free Browser-Based File Utilities",
    template: "%s | File Tools",
  },
  description: SITE_CONFIG.description,
  applicationName: "File Tools",
  keywords: [
    "file converter",
    "pdf editor",
    "merge pdf",
    "image converter",
    "audio trimmer",
    "video trimmer",
    "client-side file tools",
    "private converter",
  ],
  authors: [{ name: "File Tools" }],
  creator: "File Tools",
  publisher: "File Tools",
  verification: {
    google: "b6tj8qPu0UidXmdKF5GBkOD3GqjRsP5IQrGAoldktwI",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "File Tools",
    title: "File Tools - Free Browser-Based File Utilities",
    description: SITE_CONFIG.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "File Tools - Free Browser-Based File Utilities",
    description: SITE_CONFIG.description,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon.svg", color: "#2563EB" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <I18nProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <FeedbackNudge />
        </I18nProvider>
      </body>
    </html>
  );
}
