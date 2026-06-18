import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SessionProvider } from "@/components/providers/session-provider";

/* Geist — body text (--font-sans) */
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

/* Plus Jakarta Sans — display headings (--font-display) */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Free Serie Tracker — Track TV, Anime, Manga & More",
    template: "%s | Free Serie Tracker",
  },
  description:
    "Track your favorite TV series, anime, manga, manhwa, light novels, and webtoons. Discover where to watch legally — Netflix, Crunchyroll, Disney+ and more. Free forever.",
  keywords: [
    "serie tracker",
    "anime tracker",
    "manga tracker",
    "tv series tracker",
    "manhwa",
    "light novel",
    "webtoon",
    "watch list",
    "anilist alternative",
  ],
  authors: [{ name: "Free Serie Tracker" }],
  creator: "Free Serie Tracker",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://freeserietracker.dev",
    siteName: "Free Serie Tracker",
    title: "Free Serie Tracker — Track TV, Anime, Manga & More",
    description:
      "Track your favorite series across all platforms. Find where to watch legally.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Serie Tracker",
    description: "Track TV, Anime, Manga & More — Free forever.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(geist.variable, plusJakartaSans.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        {/* Theme initialization — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme') || 'dark';
                if (t === 'system') {
                  t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            `,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">
        <SessionProvider>
          <Navbar />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </SessionProvider>

        {/* Google AdSense — production only */}
        {process.env.NODE_ENV === "production" &&
          process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID && (
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}`}
              crossOrigin="anonymous"
            />
          )}
      </body>
    </html>
  );
}
