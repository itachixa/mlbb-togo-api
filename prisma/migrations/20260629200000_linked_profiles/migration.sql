-- AlterTable : profils Google et de jeu liés + préférence d'affichage
ALTER TABLE "User" ADD COLUMN "googleEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "googleName" TEXT;
ALTER TABLE "User" ADD COLUMN "googleAvatar" TEXT;
ALTER TABLE "User" ADD COLUMN "gameNickname" TEXT;
ALTER TABLE "User" ADD COLUMN "gameAvatar" TEXT;
ALTER TABLE "User" ADD COLUMN "gameLevel" INTEGER;
ALTER TABLE "User" ADD COLUMN "gameRankLevel" INTEGER;
ALTER TABLE "User" ADD COLUMN "gameCountry" TEXT;
ALTER TABLE "User" ADD COLUMN "gameStats" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "gameFrequentHeroes" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN "gameSyncedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "profileSource" TEXT NOT NULL DEFAULT 'game';
