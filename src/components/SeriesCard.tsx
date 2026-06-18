import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { SearchResult } from "@/types/series";
import { CONTENT_TYPE_BADGE_CLASS } from "@/types/common";

interface SeriesCardProps {
  series: SearchResult;
  /** Show content type badge (default: true) */
  showType?: boolean;
}

export default function SeriesCard({ series, showType = true }: SeriesCardProps) {
  const href = `/series/${series.source}-${series.externalId}`;

  return (
    <Link href={href} className="series-card-link" id={`series-${series.source}-${series.externalId}`}>
      <article className="poster-card">
        {series.coverImage ? (
          <Image
            src={series.coverImage}
            alt={series.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="poster-card-img"
          />
        ) : (
          <div className="poster-card-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}

        <div className="poster-overlay" />

        <div className="poster-card-info">
          {showType && (
            <span className={`badge ${CONTENT_TYPE_BADGE_CLASS[series.contentType]}`}>
              {series.contentType.replace("_", " ")}
            </span>
          )}

          {series.ratingExternal && series.ratingExternal > 0 && (
            <div className="poster-card-rating">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-star)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>{series.ratingExternal.toFixed(1)}</span>
            </div>
          )}

          <h3 className="poster-card-title">{series.title}</h3>

          {series.year && (
            <span className="poster-card-year">{series.year}</span>
          )}
        </div>
      </article>
    </Link>
  );
}
