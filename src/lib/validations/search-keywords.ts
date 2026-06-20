import { z } from "zod";

export const createSearchKeywordSchema = z.object({ label: z.string().min(1).max(50) });
export type CreateSearchKeywordInput = z.infer<typeof createSearchKeywordSchema>;

export const setDefaultKeywordSchema = z.object({ isDefault: z.literal(true) });
export type SetDefaultKeywordInput = z.infer<typeof setDefaultKeywordSchema>;
