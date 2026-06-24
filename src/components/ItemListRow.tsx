import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { ItemCard as ItemCardData } from "@/types/item";

const CATEGORY_BADGE_CLASS: Record<ItemCardData["category"], string> = {
  TYPE_A: "badge-type-a",
  TYPE_B: "badge-type-b",
  TYPE_C: "badge-type-c",
};

interface ItemListRowProps {
  item: ItemCardData;
  /** Show category badge (default: true) */
  showCategory?: boolean;
}

export default function ItemListRow({ item, showCategory = true }: ItemListRowProps) {
  const href = `/items/${item.id}`;

  return (
    <Link href={href} className="series-list-row" id={`item-list-${item.id}`}>
      <div className="series-list-thumb">
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            sizes="60px"
            className="series-list-thumb-img"
          />
        ) : (
          <div className="series-list-thumb-placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}
      </div>

      <div className="series-list-info">
        <h3 className="series-list-title">{item.title}</h3>
        <div className="series-list-meta">
          {showCategory && (
            <span className={`badge ${CATEGORY_BADGE_CLASS[item.category]}`}>
              {item.category.replace("_", " ")}
            </span>
          )}
        </div>
      </div>

      {item.ratingExternal && item.ratingExternal > 0 && (
        <div className="series-list-rating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-star)">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{item.ratingExternal.toFixed(1)}</span>
        </div>
      )}
    </Link>
  );
}
