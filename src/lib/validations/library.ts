import { z } from "zod";

export const libraryStatusEnum = z.enum([
  "WATCHING",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
]);

export const addToLibrarySchema = z.object({
  seriesId: z.string().min(1, "seriesId is required"),
  status: libraryStatusEnum.default("PLAN_TO_WATCH"),
});

export type AddToLibraryInput = z.infer<typeof addToLibrarySchema>;

export const updateLibraryStatusSchema = z.object({
  status: libraryStatusEnum,
});

export type UpdateLibraryStatusInput = z.infer<typeof updateLibraryStatusSchema>;

export const updateFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});

export type UpdateFavoriteInput = z.infer<typeof updateFavoriteSchema>;

export const updateProgressSchema = z
  .object({
    currentSeason: z.number().int().min(0).optional(),
    currentEpisode: z.number().int().min(0).optional(),
    currentChapter: z.number().int().min(0).optional(),
    currentVolume: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.currentSeason !== undefined ||
      data.currentEpisode !== undefined ||
      data.currentChapter !== undefined ||
      data.currentVolume !== undefined,
    { message: "At least one progress field is required" }
  );

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;

export const rateSeriesSchema = z.object({
  score: z.number().int().min(1, "Score must be between 1 and 10").max(10, "Score must be between 1 and 10"),
  review: z.string().max(2000, "Review must be 2000 characters or fewer").optional(),
});

export type RateSeriesInput = z.infer<typeof rateSeriesSchema>;
