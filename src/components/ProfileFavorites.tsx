import React from "react";
import ItemCardComponent from "./ItemCard";
import type { ItemCard } from "@/types/item";

interface ProfileFavoritesProps {
  favorites: ItemCard[];
}

export default function ProfileFavorites({ favorites }: ProfileFavoritesProps) {
  if (favorites.length === 0) {
    return <p className="profile-favorites-empty">No favorites yet.</p>;
  }

  return (
    <div className="series-grid">
      {favorites.map((item) => (
        <ItemCardComponent key={item.id} item={item} />
      ))}
    </div>
  );
}
