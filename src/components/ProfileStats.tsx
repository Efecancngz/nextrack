import React from "react";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_BADGE_CLASS, type ContentType } from "@/types/common";
import type { ProfileStatsData } from "@/types/profile";

interface ProfileStatsProps {
  stats: ProfileStatsData;
}

const CONTENT_TYPES: ContentType[] = ["TV_SERIES", "ANIME", "MANGA", "MANHWA", "LIGHT_NOVEL", "WEBTOON"];

export default function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <div className="profile-stats-grid">
      {CONTENT_TYPES.map((type) => (
        <div key={type} className="card profile-stat-card">
          <span className={`badge ${CONTENT_TYPE_BADGE_CLASS[type]}`}>{CONTENT_TYPE_LABELS[type]}</span>
          <span className="profile-stat-value">{stats.byContentType[type] ?? 0}</span>
        </div>
      ))}
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Episodes Watched</span>
        <span className="profile-stat-value">{stats.episodesWatched}</span>
      </div>
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Chapters Read</span>
        <span className="profile-stat-value">{stats.chaptersRead}</span>
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
