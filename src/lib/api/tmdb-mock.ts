import type { SearchResult, PlatformAvailability } from "@/types/series";
import type { ContentType, ContentStatus } from "@/types/common";

export interface MockTvDetail {
  id: number;
  name: string;
  original_name: string;
  tagline?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: { id: number; name: string }[];
  keywords?: { results: { id: number; name: string }[] };
  status: string;
  number_of_episodes: number;
  number_of_seasons: number;
  vote_average: number;
  vote_count: number;
  platforms: PlatformAvailability[];
}

export const MOCK_TV_SHOWS: Record<string, MockTvDetail> = {
  "1396": {
    id: 1396,
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    tagline: "All Hail the King.",
    overview: "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of two years left to live. To secure his family's financial future, W.W. chooses to enter a dangerous world of drugs and crime.",
    poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdrop_path: "/g0eOZeci2vcrM0oxuiEJUR94ff7.jpg",
    first_air_date: "2008-01-20",
    genres: [
      { id: 80, name: "Crime" },
      { id: 18, name: "Drama" }
    ],
    keywords: {
      results: [
        { id: 417, name: "underworld" },
        { id: 1416, name: "double life" },
        { id: 156172, name: "drug dealer" }
      ]
    },
    status: "Ended",
    number_of_episodes: 62,
    number_of_seasons: 5,
    vote_average: 8.9,
    vote_count: 13540,
    platforms: [
      {
        platformId: "netflix",
        platformName: "Netflix",
        platformLogo: "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png",
        subscriptionType: "subscription",
        region: ["US", "TR"]
      }
    ]
  },
  "1399": {
    id: 1399,
    name: "Game of Thrones",
    original_name: "Game of Thrones",
    tagline: "Winter is Coming.",
    overview: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north.",
    poster_path: "/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg",
    backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
    first_air_date: "2011-04-17",
    genres: [
      { id: 10765, name: "Sci-Fi & Fantasy" },
      { id: 18, name: "Drama" },
      { id: 10759, name: "Action & Adventure" }
    ],
    keywords: {
      results: [
        { id: 818, name: "based on novel or book" },
        { id: 1308, name: "kingdom" },
        { id: 9715, name: "dragon" }
      ]
    },
    status: "Ended",
    number_of_episodes: 73,
    number_of_seasons: 8,
    vote_average: 8.4,
    vote_count: 22430,
    platforms: [
      {
        platformId: "max",
        platformName: "Max",
        platformLogo: "/fksCUZ9QDWZMUwL2LgMtLckROUN.jpg",
        subscriptionType: "subscription",
        region: ["US", "TR"]
      }
    ]
  },
  "66732": {
    id: 66732,
    name: "Stranger Things",
    original_name: "Stranger Things",
    tagline: "One summer can change everything.",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdrop_path: "/gFZriCkpJYsApPZEF3jhxL4yLzG.jpg",
    first_air_date: "2016-07-15",
    genres: [
      { id: 18, name: "Drama" },
      { id: 10765, name: "Sci-Fi & Fantasy" },
      { id: 9648, name: "Mystery" }
    ],
    keywords: {
      results: [
        { id: 9687, name: "supernatural" },
        { id: 10683, name: "1980s" },
        { id: 15307, name: "monster" }
      ]
    },
    status: "Returning Series",
    number_of_episodes: 34,
    number_of_seasons: 4,
    vote_average: 8.6,
    vote_count: 16800,
    platforms: [
      {
        platformId: "netflix",
        platformName: "Netflix",
        platformLogo: "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png",
        subscriptionType: "subscription",
        region: ["US", "TR"]
      }
    ]
  },
  "119051": {
    id: 119051,
    name: "Wednesday",
    original_name: "Wednesday",
    tagline: "Snafu is under construction.",
    overview: "Wednesday Addams is sent to Nevermore Academy, a bizarre boarding school where she attempts to master her emerging psychic ability, thwart a monstrous killing spree, and solve the mystery that embroiled her parents 25 years ago.",
    poster_path: "/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg",
    backdrop_path: "/iH7v2j2bj3LqRGnU4O2tFyy41Bg.jpg",
    first_air_date: "2022-11-23",
    genres: [
      { id: 10765, name: "Sci-Fi & Fantasy" },
      { id: 9648, name: "Mystery" },
      { id: 35, name: "Comedy" }
    ],
    keywords: {
      results: [
        { id: 9687, name: "gothic" },
        { id: 236292, name: "boarding school" },
        { id: 15307, name: "monster" }
      ]
    },
    status: "Returning Series",
    number_of_episodes: 8,
    number_of_seasons: 1,
    vote_average: 8.5,
    vote_count: 7800,
    platforms: [
      {
        platformId: "netflix",
        platformName: "Netflix",
        platformLogo: "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png",
        subscriptionType: "subscription",
        region: ["US", "TR"]
      }
    ]
  },
  "100088": {
    id: 100088,
    name: "The Last of Us",
    original_name: "The Last of Us",
    tagline: "When you're lost in the darkness, look for the light.",
    overview: "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone. What starts as a small job soon becomes a brutal, heartbreaking journey.",
    poster_path: "/vzzGO6xnVT4Rs3GCI7dZfVZEEip.jpg",
    backdrop_path: "/acevLdSl5I2MK5RYAm7gwAndt1w.jpg",
    first_air_date: "2023-01-15",
    genres: [
      { id: 18, name: "Drama" },
      { id: 10759, name: "Action & Adventure" },
      { id: 10765, name: "Sci-Fi & Fantasy" }
    ],
    keywords: {
      results: [
        { id: 1852, name: "post-apocalypse" },
        { id: 417, name: "survival" },
        { id: 15307, name: "zombie" }
      ]
    },
    status: "Returning Series",
    number_of_episodes: 9,
    number_of_seasons: 1,
    vote_average: 8.7,
    vote_count: 4200,
    platforms: [
      {
        platformId: "max",
        platformName: "Max",
        platformLogo: "/fksCUZ9QDWZMUwL2LgMtLckROUN.jpg",
        subscriptionType: "subscription",
        region: ["US", "TR"]
      }
    ]
  },
  "94997": {
    id: 94997,
    name: "House of the Dragon",
    original_name: "House of the Dragon",
    tagline: "Fire and Blood.",
    overview: "The Targaryen dynasty is at the absolute pinnacle of its power in Westeros, with more than ten dragons under their control. But when King Viserys Targaryen's succession is thrown into doubt, a bloody civil war begins.",
    poster_path: "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg",
    backdrop_path: "/wNAhuOZ3Zf84jCIlrcI6JhgmY5q.jpg",
    first_air_date: "2022-08-21",
    genres: [
      { id: 18, name: "Drama" },
      { id: 10765, name: "Sci-Fi & Fantasy" },
      { id: 10759, name: "Action & Adventure" }
    ],
    keywords: {
      results: [
        { id: 1308, name: "succession" },
        { id: 9715, name: "dragon" },
        { id: 818, name: "prequel" }
      ]
    },
    status: "Returning Series",
    number_of_episodes: 18,
    number_of_seasons: 2,
    vote_average: 8.4,
    vote_count: 3800,
    platforms: [
      {
        platformId: "max",
        platformName: "Max",
        platformLogo: "/fksCUZ9QDWZMUwL2LgMtLckROUN.jpg",
        subscriptionType: "subscription",
        region: ["US", "TR"]
      }
    ]
  }
};

export function getMockTrendingTvSeries(): SearchResult[] {
  return Object.values(MOCK_TV_SHOWS).map((item) => ({
    externalId: String(item.id),
    source: "tmdb",
    contentType: "TV_SERIES" as ContentType,
    title: item.name,
    titleOriginal: item.original_name !== item.name ? item.original_name : undefined,
    coverImage: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
    year: new Date(item.first_air_date).getFullYear(),
    genres: item.genres.map(g => g.name),
    status: (item.status === "Ended" ? "COMPLETED" : "ONGOING") as ContentStatus,
    ratingExternal: item.vote_average
  }));
}

export function searchMockTvSeries(query: string): SearchResult[] {
  const normalizedQuery = query.toLowerCase();
  return Object.values(MOCK_TV_SHOWS)
    .filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.original_name.toLowerCase().includes(normalizedQuery)
    )
    .map((item) => ({
      externalId: String(item.id),
      source: "tmdb",
      contentType: "TV_SERIES" as ContentType,
      title: item.name,
      titleOriginal: item.original_name !== item.name ? item.original_name : undefined,
      coverImage: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
      year: new Date(item.first_air_date).getFullYear(),
      genres: item.genres.map(g => g.name),
      status: (item.status === "Ended" ? "COMPLETED" : "ONGOING") as ContentStatus,
      ratingExternal: item.vote_average
    }));
}
