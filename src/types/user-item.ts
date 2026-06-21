import type { ItemCard } from "./item";

export type TrackingStatus =
  | "ACTIVE"
  | "PLANNED"
  | "COMPLETED"
  | "PAUSED"
  | "DROPPED";

export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  ACTIVE: "Active",
  PLANNED: "Planned",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  DROPPED: "Dropped",
};

export const TRACKING_STATUS_BADGE_CLASS: Record<TrackingStatus, string> = {
  ACTIVE: "badge-watching",
  PLANNED: "badge-plan",
  COMPLETED: "badge-completed",
  PAUSED: "badge-on-hold",
  DROPPED: "badge-dropped",
};

export interface UserItemEntry {
  id: string;
  userId: string;
  itemId: string;
  status: TrackingStatus;
  isFavorite: boolean;
  progress?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  item: ItemCard;
}
