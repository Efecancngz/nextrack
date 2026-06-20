import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateNotificationSettingsSchema } from "@/lib/validations/notifications";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function patchHandler(req: NextRequest) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = updateNotificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationsEnabled: parsed.data.notificationsEnabled },
  });

  return successResponse({ notificationsEnabled: parsed.data.notificationsEnabled });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
