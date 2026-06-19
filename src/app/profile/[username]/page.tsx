import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileStats from "@/components/ProfileStats";
import ProfileFavorites from "@/components/ProfileFavorites";
import type { ContentType } from "@/types/common";
import type { ProfileStatsData } from "@/types/profile";
import type { SeriesCard } from "@/types/series";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `${username}'s series tracking profile`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    notFound();
  }

  const [itemsByType, progressSums, ratingAvg, favoriteItems] = await Promise.all([
    prisma.libraryItem.findMany({
      where: { userId: user.id },
      select: { series: { select: { contentType: true } } },
    }),
    prisma.libraryItem.aggregate({
      where: { userId: user.id },
      _sum: { currentEpisode: true, currentChapter: true },
    }),
    prisma.userRating.aggregate({
      where: { userId: user.id },
      _avg: { score: true },
    }),
    prisma.libraryItem.findMany({
      where: { userId: user.id, isFavorite: true },
      include: { series: true },
    }),
  ]);

  const byContentType = itemsByType.reduce((acc, item) => {
    const type = item.series.contentType as ContentType;
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {} as Record<ContentType, number>);

  const stats: ProfileStatsData = {
    byContentType,
    episodesWatched: progressSums._sum.currentEpisode ?? 0,
    chaptersRead: progressSums._sum.currentChapter ?? 0,
    averageRating: ratingAvg._avg.score,
  };

  const favorites: SeriesCard[] = favoriteItems.map((item) => ({
    id: item.series.id,
    externalId: item.series.externalId,
    source: item.series.source,
    contentType: item.series.contentType,
    status: item.series.status,
    title: item.series.title,
    titleOriginal: item.series.titleOriginal ?? undefined,
    coverImage: item.series.coverImage ?? undefined,
    year: item.series.year ?? undefined,
    genres: item.series.genres,
    ratingExternal: item.series.ratingExternal ?? undefined,
    totalEpisodes: item.series.totalEpisodes ?? undefined,
    totalChapters: item.series.totalChapters ?? undefined,
    platforms: [],
  }));

  return (
    <div className="container-content page-enter">
      <ProfileHeader
        displayName={user.name}
        username={user.username ?? username}
        image={user.image}
        joinedAt={user.createdAt.toISOString()}
      />

      <h2 className="profile-section-title">Statistics</h2>
      <ProfileStats stats={stats} />

      <h2 className="profile-section-title">Favorites</h2>
      <ProfileFavorites favorites={favorites} />
    </div>
  );
}
