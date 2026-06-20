import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function patchHandler() {
  const user = await requireAuth();

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return successResponse({ updated: result.count });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
