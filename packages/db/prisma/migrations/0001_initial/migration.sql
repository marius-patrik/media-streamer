-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DOWNLOADER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TitleKind" AS ENUM ('MOVIE', 'SHOW');

-- CreateEnum
CREATE TYPE "CreatedFrom" AS ENUM ('LOCAL_SCAN', 'TMDB', 'CLOUD', 'DOWNLOAD_SEARCH', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('TMDB', 'PROWLARR', 'CLOUD_PROVIDER');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('IMPORTED', 'NEEDS_REVIEW', 'MISSING');

-- CreateEnum
CREATE TYPE "DownloadClient" AS ENUM ('QBITTORRENT');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('SEARCHED', 'QUEUED', 'DOWNLOADING', 'COMPLETED', 'IMPORTING', 'IMPORTED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('PROWLARR', 'MAGNET', 'TORRENT_UPLOAD');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('LOCAL', 'DOWNLOAD', 'CLOUD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "kind" "TitleKind" NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "overview" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "createdFrom" "CreatedFrom" NOT NULL,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'UNMATCHED',

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "name" TEXT,
    "overview" TEXT,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalId" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "episodeId" TEXT,
    "provider" "ExternalProvider" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ExternalId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalAsset" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "episodeId" TEXT,
    "relativePath" TEXT NOT NULL,
    "absolutePath" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "container" TEXT,
    "videoCodec" TEXT,
    "audioCodec" TEXT,
    "durationSeconds" INTEGER,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'IMPORTED',

    CONSTRAINT "LocalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtitle" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "absolutePath" TEXT NOT NULL,
    "language" TEXT,
    "format" TEXT NOT NULL,

    CONSTRAINT "Subtitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudSource" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "episodeId" TEXT,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CloudSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadJob" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "episodeId" TEXT,
    "client" "DownloadClient" NOT NULL DEFAULT 'QBITTORRENT',
    "clientHash" TEXT,
    "name" TEXT NOT NULL,
    "magnetUri" TEXT,
    "status" "DownloadStatus" NOT NULL DEFAULT 'SEARCHED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downloadPath" TEXT,
    "importedAssetId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownloadJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCandidate" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "episodeId" TEXT,
    "source" "CandidateSource" NOT NULL,
    "name" TEXT NOT NULL,
    "magnetUri" TEXT,
    "sizeBytes" BIGINT,
    "seeders" INTEGER,
    "leechers" INTEGER,
    "quality" TEXT,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTitleState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "episodeId" TEXT,
    "subjectKey" TEXT NOT NULL,
    "progressSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "lastSourceType" "SourceType",
    "lastSourceId" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserTitleState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Title_name_idx" ON "Title"("name");

-- CreateIndex
CREATE INDEX "Title_kind_year_idx" ON "Title"("kind", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_titleId_seasonNumber_episodeNumber_key" ON "Episode"("titleId", "seasonNumber", "episodeNumber");

-- CreateIndex
CREATE INDEX "ExternalId_titleId_idx" ON "ExternalId"("titleId");

-- CreateIndex
CREATE INDEX "ExternalId_episodeId_idx" ON "ExternalId"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalId_provider_value_key" ON "ExternalId"("provider", "value");

-- CreateIndex
CREATE INDEX "LocalAsset_titleId_idx" ON "LocalAsset"("titleId");

-- CreateIndex
CREATE INDEX "LocalAsset_episodeId_idx" ON "LocalAsset"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalAsset_absolutePath_key" ON "LocalAsset"("absolutePath");

-- CreateIndex
CREATE INDEX "Subtitle_assetId_idx" ON "Subtitle"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Subtitle_assetId_absolutePath_key" ON "Subtitle"("assetId", "absolutePath");

-- CreateIndex
CREATE INDEX "CloudSource_titleId_idx" ON "CloudSource"("titleId");

-- CreateIndex
CREATE INDEX "CloudSource_episodeId_idx" ON "CloudSource"("episodeId");

-- CreateIndex
CREATE INDEX "DownloadJob_titleId_idx" ON "DownloadJob"("titleId");

-- CreateIndex
CREATE INDEX "DownloadJob_episodeId_idx" ON "DownloadJob"("episodeId");

-- CreateIndex
CREATE INDEX "DownloadJob_clientHash_idx" ON "DownloadJob"("clientHash");

-- CreateIndex
CREATE INDEX "DownloadJob_status_idx" ON "DownloadJob"("status");

-- CreateIndex
CREATE INDEX "SearchCandidate_titleId_idx" ON "SearchCandidate"("titleId");

-- CreateIndex
CREATE INDEX "SearchCandidate_episodeId_idx" ON "SearchCandidate"("episodeId");

-- CreateIndex
CREATE INDEX "SearchCandidate_source_idx" ON "SearchCandidate"("source");

-- CreateIndex
CREATE INDEX "UserTitleState_titleId_idx" ON "UserTitleState"("titleId");

-- CreateIndex
CREATE INDEX "UserTitleState_episodeId_idx" ON "UserTitleState"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTitleState_userId_subjectKey_key" ON "UserTitleState"("userId", "subjectKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalId" ADD CONSTRAINT "ExternalId_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalId" ADD CONSTRAINT "ExternalId_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalAsset" ADD CONSTRAINT "LocalAsset_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalAsset" ADD CONSTRAINT "LocalAsset_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtitle" ADD CONSTRAINT "Subtitle_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "LocalAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudSource" ADD CONSTRAINT "CloudSource_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudSource" ADD CONSTRAINT "CloudSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadJob" ADD CONSTRAINT "DownloadJob_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadJob" ADD CONSTRAINT "DownloadJob_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadJob" ADD CONSTRAINT "DownloadJob_importedAssetId_fkey" FOREIGN KEY ("importedAssetId") REFERENCES "LocalAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadJob" ADD CONSTRAINT "DownloadJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchCandidate" ADD CONSTRAINT "SearchCandidate_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchCandidate" ADD CONSTRAINT "SearchCandidate_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTitleState" ADD CONSTRAINT "UserTitleState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTitleState" ADD CONSTRAINT "UserTitleState_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTitleState" ADD CONSTRAINT "UserTitleState_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
