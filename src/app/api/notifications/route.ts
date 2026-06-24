import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler() {
  const user = await requireAuth();

  const [notifications, unreadCount, userRow] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationsEnabled: true },
    }),
  ]);

  return successResponse({
    notifications,
    unreadCount,
    notificationsEnabled: userRow?.notificationsEnabled ?? true,
  });
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
