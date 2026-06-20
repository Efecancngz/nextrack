import { z } from "zod";

export const updateNotificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
});

export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
