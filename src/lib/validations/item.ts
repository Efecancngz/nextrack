import { z } from "zod";

export const trackingStatusEnum = z.enum([
  "ACTIVE",
  "PLANNED",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
]);

export const addToTrackingSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
  status: trackingStatusEnum.default("PLANNED"),
});

export type AddToTrackingInput = z.infer<typeof addToTrackingSchema>;

export const updateTrackingStatusSchema = z.object({
  status: trackingStatusEnum,
});

export type UpdateTrackingStatusInput = z.infer<
  typeof updateTrackingStatusSchema
>;

export const updateTrackingFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});

export type UpdateTrackingFavoriteInput = z.infer<
  typeof updateTrackingFavoriteSchema
>;

export const updateTrackingProgressSchema = z.object({
  progress: z.number().int().min(0),
  notes: z.string().max(2000).optional(),
});

export type UpdateTrackingProgressInput = z.infer<
  typeof updateTrackingProgressSchema
>;

export const rateItemSchema = z.object({
  score: z
    .number()
    .int()
    .min(1, "Score must be between 1 and 10")
    .max(10, "Score must be between 1 and 10"),
  review: z
    .string()
    .max(2000, "Review must be 2000 characters or fewer")
    .optional(),
});

export type RateItemInput = z.infer<typeof rateItemSchema>;
