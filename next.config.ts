import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow TMDB and AniList CDN images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
        pathname: "/file/**",
      },
      {
        protocol: "https",
        hostname: "uploads.mangadex.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
        pathname: "/**",
      },
    ],
  },

  // Cloudflare Workers compatible — no standalone output needed with OpenNext
  // @opennextjs/cloudflare handles the build process

  // Logging in production
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
