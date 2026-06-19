import React from "react";
import SeriesCardComponent from "./SeriesCard";
import type { SeriesCard } from "@/types/series";

interface ProfileFavoritesProps {
  // SeriesCard (data interface) is a structural superset of SearchResult, the
  // prop type SeriesCardComponent actually expects — every favorite passed
  // here satisfies it. Keep that relationship in mind if either type narrows.
  favorites: SeriesCard[];
}

export default function ProfileFavorites({ favorites }: ProfileFavoritesProps) {
  if (favorites.length === 0) {
    return <p className="profile-favorites-empty">No favorites yet.</p>;
  }

  return (
    <div className="series-grid">
      {favorites.map((series) => (
        <SeriesCardComponent key={`${series.source}-${series.externalId}`} series={series} />
      ))}
    </div>
  );
}
