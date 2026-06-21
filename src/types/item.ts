export type ItemCategory = "TYPE_A" | "TYPE_B" | "TYPE_C";

export type ItemStatus =
  | "ONGOING"
  | "COMPLETED"
  | "HIATUS"
  | "CANCELLED"
  | "UPCOMING";

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  TYPE_A: "Type A",
  TYPE_B: "Type B",
  TYPE_C: "Type C",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  HIATUS: "On Hiatus",
  CANCELLED: "Cancelled",
  UPCOMING: "Upcoming",
};

export interface ItemCard {
  id: string;
  category: ItemCategory;
  status: ItemStatus;
  title: string;
  description?: string;
  coverImage?: string;
  totalUnits?: number;
  ratingExternal?: number;
}

export interface ItemDetail extends ItemCard {
  externalId: string;
  source: string;
}
