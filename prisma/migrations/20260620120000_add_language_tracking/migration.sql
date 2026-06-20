-- AlterTable
ALTER TABLE "LibraryItem" ADD COLUMN "waitLanguage" TEXT;

-- CreateTable
CREATE TABLE "EpisodeLanguage" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "latestChapter" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeLanguage_seriesId_language_key" ON "EpisodeLanguage"("seriesId", "language");

-- AddForeignKey
ALTER TABLE "EpisodeLanguage" ADD CONSTRAINT "EpisodeLanguage_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
