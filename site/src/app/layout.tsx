import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Amiri } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { SmoothScrollProvider } from "@/lib/motion";
import JsonLd from "@/components/JsonLd";
import { seoPages, siteUrl } from "@/data/seo";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

const home = seoPages[0];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: home.title.en,
    template: "%s | Feather Wing Tours",
  },
  description: home.description.en,
  keywords: [
    "Feather Wing Tours", "travel Saudi Arabia", "Umrah packages", "AlUla tours",
    "desert camping", "corporate events", "visa services", "flight tickets",
  ],
  alternates: {
    canonical: "/",
    languages: { en: "/", ar: "/?lang=ar", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Feather Wing Tours",
    title: home.title.en,
    description: home.description.en,
    images: [{ url: "/media/finale.png", width: 1376, height: 768, alt: "Feather Wing Tours — One Wing. Endless Destinations." }],
    locale: "en_US",
    alternateLocale: "ar_SA",
  },
  twitter: {
    card: "summary_large_image",
    title: home.title.en,
    description: home.description.en,
    images: ["/media/finale.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#030611",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={`${playfair.variable} ${inter.variable} ${amiri.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <JsonLd />
        <LanguageProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
