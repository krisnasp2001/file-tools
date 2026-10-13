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
