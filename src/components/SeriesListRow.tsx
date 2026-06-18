import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { SearchResult } from "@/types/series";
import { CONTENT_TYPE_BADGE_CLASS } from "@/types/common";

interface SeriesListRowProps {
  series: SearchResult;
  /** Show content type badge (default: true) */
  showType?: boolean;
}

export default function SeriesListRow({ series, showType = true }: SeriesListRowProps) {
  const href = `/series/${series.source}-${series.externalId}`;

  return (
    <Link
      href={href}
      className="series-list-row"
      id={`series-list-${series.source}-${series.externalId}`}
    >
      <div className="series-list-thumb">
        {series.coverImage ? (
          <Image
            src={series.coverImage}
            alt={series.title}
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
        <h3 className="series-list-title">{series.title}</h3>
        <div className="series-list-meta">
          {showType && (
            <span className={`badge ${CONTENT_TYPE_BADGE_CLASS[series.contentType]}`}>
              {series.contentType.replace("_", " ")}
            </span>
          )}
          {series.year && <span className="series-list-year">{series.year}</span>}
          {series.genres.slice(0, 2).map((g) => (
            <span key={g} className="series-list-genre">{g}</span>
          ))}
        </div>
      </div>

      {series.ratingExternal && series.ratingExternal > 0 && (
        <div className="series-list-rating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-star)">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{series.ratingExternal.toFixed(1)}</span>
        </div>
      )}
    </Link>
  );
}
