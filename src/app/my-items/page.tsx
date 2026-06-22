import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import TrackingBoard from "@/components/TrackingBoard";
import type { UserItemEntry } from "@/types/user-item";

export const metadata: Metadata = {
  title: "My Items",
  description: "Your personal tracking list",
};

export const dynamic = "force-dynamic";

export default async function MyItemsPage() {
  const user = await requireAuth();

  const rows = await prisma.userItem.findMany({
    where: { userId: user.id },
    include: { item: true },
    orderBy: { updatedAt: "desc" },
  });

  const entries: UserItemEntry[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    itemId: row.itemId,
    status: row.status,
    isFavorite: row.isFavorite,
    progress: row.progress ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    item: {
      id: row.item.id,
      category: row.item.category,
      status: row.item.status,
      title: row.item.title,
      description: row.item.description ?? undefined,
      coverImage: row.item.coverImage ?? undefined,
      totalUnits: row.item.totalUnits ?? undefined,
      ratingExternal: row.item.ratingExternal ?? undefined,
    },
  }));

  return (
    <div className="container-content page-enter library-page">
      <div className="library-header">
        <h1 className="library-title">My Items</h1>
      </div>

      {entries.length === 0 ? (
        <div className="library-empty">
          <div className="library-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="m9 10 2 2 4-4" />
            </svg>
          </div>
          <h2 className="library-empty-title">Nothing tracked yet</h2>
          <p className="library-empty-text">
            Start by browsing items and adding them to your tracking list.
          </p>
          <div className="library-empty-actions">
            <Link href="/browse" className="btn btn-primary">
              Browse Items
            </Link>
          </div>
        </div>
      ) : (
        <TrackingBoard initialEntries={entries} />
      )}
    </div>
  );
}
