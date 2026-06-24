import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileStats from "@/components/ProfileStats";
import ProfileFavorites from "@/components/ProfileFavorites";
import type { ItemCategory } from "@/types/item";
import type { ProfileStatsData } from "@/types/profile";
import type { ItemCard } from "@/types/item";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `${username}'s tracking profile`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    notFound();
  }

  const [itemsByCategory, progressSum, ratingAvg, favoriteEntries] = await Promise.all([
    prisma.userItem.findMany({
      where: { userId: user.id },
      select: { item: { select: { category: true } } },
    }),
    prisma.userItem.aggregate({
      where: { userId: user.id },
      _sum: { progress: true },
    }),
    prisma.rating.aggregate({
      where: { userId: user.id },
      _avg: { score: true },
    }),
    prisma.userItem.findMany({
      where: { userId: user.id, isFavorite: true },
      include: { item: true },
    }),
  ]);

  const byCategory = itemsByCategory.reduce((acc, row) => {
    const category = row.item.category as ItemCategory;
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {} as Record<ItemCategory, number>);

  const stats: ProfileStatsData = {
    byCategory,
    totalProgress: progressSum._sum.progress ?? 0,
    averageRating: ratingAvg._avg.score,
  };

  const favorites: ItemCard[] = favoriteEntries.map((entry) => ({
    id: entry.item.id,
    category: entry.item.category,
    status: entry.item.status,
    title: entry.item.title,
    description: entry.item.description ?? undefined,
    coverImage: entry.item.coverImage ?? undefined,
    totalUnits: entry.item.totalUnits ?? undefined,
    ratingExternal: entry.item.ratingExternal ?? undefined,
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
