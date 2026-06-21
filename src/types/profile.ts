import type { ItemCategory } from "./item";

export interface ProfileStatsData {
  byCategory: Record<ItemCategory, number>;
  totalProgress: number;
  averageRating: number | null;
}
