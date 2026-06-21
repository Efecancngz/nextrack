import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ITEM_CATEGORY_LABELS, ITEM_STATUS_LABELS } from "@/types/item";
import type { TrackingStatus } from "@/types/user-item";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import AddToTrackingButton from "@/components/AddToTrackingButton";
import RatingWidget from "@/components/RatingWidget";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return { title: "Item Not Found" };

  return {
    title: item.title,
    description: item.description?.slice(0, 160) || `Track ${item.title}`,
    openGraph: {
      title: item.title,
      description: item.description?.slice(0, 160),
      images: item.coverImage ? [{ url: item.coverImage }] : [],
    },
  };
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });

  if (!item) {
    notFound();
  }

  const user = await getCurrentUser();
  let existingEntry: { id: string; status: TrackingStatus } | null = null;
  let existingRating: { score: number; review: string | null } | null = null;

  if (user) {
    const [entryRow, ratingRow] = await Promise.all([
      prisma.userItem.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
      }),
      prisma.rating.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
      }),
    ]);
    if (entryRow) existingEntry = { id: entryRow.id, status: entryRow.status };
    if (ratingRow) existingRating = { score: ratingRow.score, review: ratingRow.review };
  }

  return (
    <div className="page-enter">
      <div className="container-content detail-content">
        <div className="detail-layout">
          {/* Poster */}
          <aside className="detail-poster-col">
            <div className="detail-poster">
              {item.coverImage ? (
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  width={300}
                  height={450}
                  className="detail-poster-img"
                  priority
                />
              ) : (
                <div className="detail-poster-placeholder">No Image</div>
              )}
            </div>

            <AddToTrackingButton
              itemId={item.id}
              initialEntry={existingEntry}
              isSignedIn={!!user}
            />
          </aside>

          {/* Info */}
          <div className="detail-info">
            <div className="detail-meta-row">
              <span className={`badge badge-${item.category.toLowerCase().replace("_", "-")}`}>
                {ITEM_CATEGORY_LABELS[item.category]}
              </span>
              <span className="detail-status">{ITEM_STATUS_LABELS[item.status]}</span>
            </div>

            <h1 className="detail-title">{item.title}</h1>

            {item.ratingExternal != null && item.ratingExternal > 0 && (
              <div className="detail-ratings">
                <div className="detail-rating-item">
                  <span className="detail-rating-score">{item.ratingExternal.toFixed(1)}</span>
                  <span className="detail-rating-label">External</span>
                </div>
              </div>
            )}

            <RatingWidget
              itemId={item.id}
              initialRating={existingRating}
              isSignedIn={!!user}
            />

            {item.totalUnits != null && (
              <div className="detail-counts">
                <span className="detail-count-item">
                  <strong>{item.totalUnits}</strong> units
                </span>
              </div>
            )}

            {item.description && (
              <div className="detail-synopsis">
                <h2 className="detail-section-title">Description</h2>
                <p>{item.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
