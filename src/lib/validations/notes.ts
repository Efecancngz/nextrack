import { z } from "zod";

export const updateNoteSchema = z.object({ content: z.string() });
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
