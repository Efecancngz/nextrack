import { prisma } from "./db/prisma";
import { simulateExampleItemUpdate } from "./api/example-source";

const THROTTLE_MS = 60 * 60 * 1000; // 1 hour

export async function checkForItemUpdates(userId: string): Promise<{ created: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.notificationsEnabled) return { created: 0 };

  if (user.lastNotificationCheckAt) {
    const elapsed = Date.now() - user.lastNotificationCheckAt.getTime();
    if (elapsed < THROTTLE_MS) return { created: 0 };
  }

  const trackedItems = await prisma.userItem.findMany({
    where: { userId },
    include: { item: true },
  });

  const results = await Promise.all(
    trackedItems.map(async (tracked): Promise<number> => {
      const { item } = tracked;
      try {
        const newTotal = await simulateExampleItemUpdate(item.externalId);
        if (newTotal !== null && item.totalUnits !== null && newTotal > item.totalUnits) {
          await prisma.$transaction([
            prisma.notification.create({
              data: {
                userId,
                itemId: item.id,
                message: `${item.title} just reached unit ${newTotal}`,
              },
            }),
            prisma.item.update({
              where: { id: item.id },
              data: { totalUnits: newTotal },
            }),
          ]);
          return 1;
        }
      } catch (err) {
        console.error(`[Notifications] Failed to check ${item.source}-${item.externalId}:`, err);
      }
      return 0;
    })
  );

  const created = results.reduce((acc, val) => acc + val, 0);

  await prisma.user.update({
    where: { id: userId },
    data: { lastNotificationCheckAt: new Date() },
  });

  return { created };
}
