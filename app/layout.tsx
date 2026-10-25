import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import Providers from "@/components/Providers";
import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import CustomCursor from "@/components/CustomCursor";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { DESC, KEYWORDS, SITE, TITLE, siteLd } from "@/lib/seo";
import { THEME_SCRIPT, tokenCss } from "@/lib/theme";
import { getContent } from "@/lib/content";
import { ContentProvider } from "@/components/ContentProvider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const GA = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s — Gravityy Studio" },
  description: DESC,
  keywords: KEYWORDS,
  applicationName: "Gravityy Studio",
  authors: [{ name: "Gravityy Studio", url: SITE }],
  creator: "Gravityy Studio",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Gravityy Studio", title: TITLE, description: DESC, locale: "en_IN" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1, "max-snippet": -1 } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  colorScheme: "dark light",
};


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent();
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Before first paint: flag JS (hero intro pre-states) and apply the saved/OS theme, so neither flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: tokenCss(content.theme, content.typography) }} />
        <JsonLd data={siteLd(content)} />
      </head>
      <body>
        <a href="#main" className="sr-only z-[100] rounded-lg bg-accent px-4 py-2 font-medium text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <ContentProvider value={content}>
        <Providers>
          <Preloader />
          <Navbar />
          {children}
          <Footer />
          <CustomCursor />
        </Providers>
        </ContentProvider>
        <Analytics />
        {GA && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
