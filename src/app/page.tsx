import React from "react";
import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import HeroSlider from "@/components/HeroSlider";
import { ITEM_CATEGORY_LABELS, type ItemCard as ItemCardData, type ItemCategory } from "@/types/item";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const CATEGORIES: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];

function toItemCard(row: {
  id: string;
  category: ItemCategory;
  status: ItemCardData["status"];
  title: string;
  description: string | null;
  coverImage: string | null;
  totalUnits: number | null;
  ratingExternal: number | null;
}): ItemCardData {
  return {
    id: row.id,
    category: row.category,
    status: row.status,
    title: row.title,
    description: row.description ?? undefined,
    coverImage: row.coverImage ?? undefined,
    totalUnits: row.totalUnits ?? undefined,
    ratingExternal: row.ratingExternal ?? undefined,
  };
}

export default async function HomePage() {
  const allItems = await prisma.item.findMany({ orderBy: { title: "asc" } });
  const items = allItems.map(toItemCard);

  const byCategory = CATEGORIES.reduce((acc, category) => {
    acc[category] = items.filter((i) => i.category === category);
    return acc;
  }, {} as Record<ItemCategory, ItemCardData[]>);

  const trending = items.filter((i) => i.status === "ONGOING").slice(0, 8);

  return (
    <div className="page-enter">
      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="container-content hero-grid">
          {/* Left — copy */}
          <div className="hero-copy">
            <p className="hero-eyebrow-text">A generic SaaS starter</p>

            <h1 className="hero-title">
              Track anything.<br />
              <span className="hero-title-accent">Stay on top of progress.</span>
            </h1>

            <p className="hero-body">
              A working example of auth, personal tracking, ratings, and
              cron-based notifications — built on a generic Item/UserItem model
              you can adapt to any content domain.
            </p>

            <div className="hero-actions">
              <Link href="/browse" className="btn btn-primary btn-lg">
                Browse catalogue
              </Link>
              <Link href="/auth/signin" className="btn btn-ghost btn-lg">
                Sign in
              </Link>
            </div>
          </div>

          {/* Right — visual slider */}
          <div className="hero-visual">
            <HeroSlider byCategory={byCategory} />
            <div className="hero-visual-fade" />
          </div>
        </div>
      </section>

      <div className="container-content">
        {/* ── Trending ── */}
        {trending.length > 0 && (
          <section className="trending-section" id="trending">
            <div className="section-header">
              <h2 className="section-title">Trending</h2>
              <Link href="/browse" className="section-see-all">
                See all →
              </Link>
            </div>
            <div className="series-grid">
              {trending.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── What you can track ── */}
        <section className="content-types-section">
          <h2 className="section-label">What you can track</h2>
          <div className="content-type-grid">
            {CATEGORIES.map((category) => (
              <div key={category} className="content-type-card">
                <span className={`badge badge-${category.toLowerCase().replace("_", "-")}`}>
                  {ITEM_CATEGORY_LABELS[category]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
