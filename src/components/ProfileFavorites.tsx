import React from "react";
import SeriesCardComponent from "./SeriesCard";
import type { SeriesCard } from "@/types/series";

interface ProfileFavoritesProps {
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
