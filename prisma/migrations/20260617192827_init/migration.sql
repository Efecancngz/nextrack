-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TV_SERIES', 'ANIME', 'MANGA', 'MANHWA', 'LIGHT_NOVEL', 'WEBTOON');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED', 'UPCOMING');

-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('WATCHING', 'PLAN_TO_WATCH', 'COMPLETED', 'ON_HOLD', 'DROPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'ONGOING',
    "title" TEXT NOT NULL,
    "titleOriginal" TEXT,
    "titleRomaji" TEXT,
    "synopsis" TEXT,
    "coverImage" TEXT,
    "bannerImage" TEXT,
    "genres" TEXT[],
    "tags" TEXT[],
    "year" INTEGER,
    "season" TEXT,
    "totalEpisodes" INTEGER,
    "totalChapters" INTEGER,
    "totalVolumes" INTEGER,
    "ratingExternal" DOUBLE PRECISION,
    "ratingTmdb" DOUBLE PRECISION,
    "ratingAniList" DOUBLE PRECISION,
    "ratingImdb" DOUBLE PRECISION,
    "ratingMal" DOUBLE PRECISION,
    "platforms" JSONB NOT NULL DEFAULT '[]',
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "status" "LibraryStatus" NOT NULL DEFAULT 'PLAN_TO_WATCH',
    "currentSeason" INTEGER,
    "currentEpisode" INTEGER,
    "currentChapter" INTEGER,
    "currentVolume" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Series_contentType_idx" ON "Series"("contentType");

-- CreateIndex
CREATE INDEX "Series_title_idx" ON "Series"("title");

-- CreateIndex
CREATE INDEX "Series_cachedAt_idx" ON "Series"("cachedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Series_externalId_source_key" ON "Series"("externalId", "source");

-- CreateIndex
CREATE INDEX "LibraryItem_userId_idx" ON "LibraryItem"("userId");

-- CreateIndex
CREATE INDEX "LibraryItem_userId_status_idx" ON "LibraryItem"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryItem_userId_seriesId_key" ON "LibraryItem"("userId", "seriesId");

-- CreateIndex
CREATE INDEX "UserRating_userId_idx" ON "UserRating"("userId");

-- CreateIndex
CREATE INDEX "UserRating_seriesId_idx" ON "UserRating"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_userId_seriesId_key" ON "UserRating"("userId", "seriesId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
