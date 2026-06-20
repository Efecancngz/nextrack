import { prisma } from "./db/prisma";
import { getMangaChapters } from "./api/mangadex";

interface LanguageGroup {
  seriesId: string;
  externalId: string;
  title: string;
  language: string;
  userIds: string[];
}

export async function checkLanguageAvailability(): Promise<{ created: number }> {
  const items = await prisma.libraryItem.findMany({
    where: { waitLanguage: { not: null } },
    include: { series: true },
  });

  const groups = new Map<string, LanguageGroup>();
  for (const item of items) {
    if (item.series.source !== "mangadex" || !item.waitLanguage) continue;
    const key = `${item.seriesId}:${item.waitLanguage}`;
    const existing = groups.get(key);
    if (existing) {
      existing.userIds.push(item.userId);
    } else {
      groups.set(key, {
        seriesId: item.seriesId,
        externalId: item.series.externalId,
        title: item.series.title,
        language: item.waitLanguage,
        userIds: [item.userId],
      });
    }
  }

  const results = await Promise.all(
    Array.from(groups.values()).map(async (group): Promise<number> => {
      try {
        const { total } = await getMangaChapters(group.externalId, 1, 1, group.language.toLowerCase());
        if (total === 0) return 0;

        const existing = await prisma.episodeLanguage.findUnique({
          where: { seriesId_language: { seriesId: group.seriesId, language: group.language } },
        });

        if (existing && total <= existing.latestChapter) return 0;

        const languageName = group.language === "TR" ? "Turkish" : "English";
        await prisma.$transaction([
          ...group.userIds.map((userId) =>
            prisma.notification.create({
              data: {
                userId,
                seriesId: group.seriesId,
                message: `${group.title} now has ${total} chapter${total === 1 ? "" : "s"} available in ${languageName}`,
              },
            })
          ),
          prisma.episodeLanguage.upsert({
            where: { seriesId_language: { seriesId: group.seriesId, language: group.language } },
            create: { seriesId: group.seriesId, language: group.language, latestChapter: total },
            update: { latestChapter: total },
          }),
        ]);
        return group.userIds.length;
      } catch (err) {
        console.error(`[LanguageTracking] Failed to check ${group.seriesId} (${group.language}):`, err);
        return 0;
      }
    })
  );

  return { created: results.reduce((acc, val) => acc + val, 0) };
}
