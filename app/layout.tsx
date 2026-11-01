import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BOOT_SCRIPT } from "@/lib/storage";
import { site } from "@/content/site";
import "./globals.css";

const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.title}`, template: `%s — ${site.name}` },
  description: site.intro,
  openGraph: { title: site.name, description: site.intro, url: site.url, siteName: site.name, type: "website" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#191817" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <link rel="preload" href="/fonts/DSEG14Classic-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
