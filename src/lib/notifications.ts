import { prisma } from "./db/prisma";
import { getTvEpisodeCount } from "./api/tmdb";
import { getAnimeEpisodeCount } from "./api/anilist";
import { getMangaChapters } from "./api/mangadex";

const THROTTLE_MS = 60 * 60 * 1000; // 1 hour, matches the existing revalidate:3600 ISR convention

export async function checkForNewEpisodes(userId: string): Promise<{ created: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.notificationsEnabled) return { created: 0 };

  if (user.lastNotificationCheckAt) {
    const elapsed = Date.now() - user.lastNotificationCheckAt.getTime();
    if (elapsed < THROTTLE_MS) return { created: 0 };
  }

  const items = await prisma.libraryItem.findMany({
    where: { userId },
    include: { series: true },
  });

  const results = await Promise.all(
    items.map(async (item): Promise<number> => {
      const { series } = item;
      try {
        let newCount: number | null = null;
        let field: "totalEpisodes" | "totalChapters" = "totalEpisodes";

        if (series.source === "tmdb") {
          newCount = await getTvEpisodeCount(series.externalId);
          field = "totalEpisodes";
        } else if (series.source === "anilist" && series.contentType === "ANIME") {
          newCount = await getAnimeEpisodeCount(series.externalId);
          field = "totalEpisodes";
        } else if (series.source === "mangadex") {
          const { total } = await getMangaChapters(series.externalId, 1, 1);
          newCount = total;
          field = "totalChapters";
        } else {
          return 0;
        }

        const oldCount = field === "totalEpisodes" ? series.totalEpisodes : series.totalChapters;
        if (newCount !== null && oldCount !== null && newCount > oldCount) {
          const unit = field === "totalEpisodes" ? "episode" : "chapter";
          await prisma.$transaction([
            prisma.notification.create({
              data: {
                userId,
                seriesId: series.id,
                libraryItemId: item.id,
                message: `${series.title} just reached ${unit} ${newCount}`,
              },
            }),
            prisma.series.update({
              where: { id: series.id },
              data: { [field]: newCount },
            }),
          ]);
          return 1;
        }
      } catch (err) {
        console.error(`[Notifications] Failed to check ${series.source}-${series.externalId}:`, err);
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
