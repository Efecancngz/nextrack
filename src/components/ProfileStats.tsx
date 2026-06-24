import React from "react";
import { ITEM_CATEGORY_LABELS, type ItemCategory } from "@/types/item";
import type { ProfileStatsData } from "@/types/profile";

interface ProfileStatsProps {
  stats: ProfileStatsData;
}

const CATEGORIES: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];

export default function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <div className="profile-stats-grid">
      {CATEGORIES.map((category) => (
        <div key={category} className="card profile-stat-card">
          <span className={`badge badge-${category.toLowerCase().replace("_", "-")}`}>
            {ITEM_CATEGORY_LABELS[category]}
          </span>
          <span className="profile-stat-value">{stats.byCategory[category] ?? 0}</span>
        </div>
      ))}
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Total Progress</span>
        <span className="profile-stat-value">{stats.totalProgress}</span>
      </div>
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Average Rating Given</span>
        <span className="profile-stat-value">
          {stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—"}
        </span>
      </div>
    </div>
  );
}
