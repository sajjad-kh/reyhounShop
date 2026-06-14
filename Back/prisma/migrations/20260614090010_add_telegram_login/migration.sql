/*
  Warnings:

  - A unique constraint covering the columns `[telegramChatId]` on the table `AuthSession` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[telegramId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramConnectedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "telegramFirstName" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramId" BIGINT;
ALTER TABLE "User" ADD COLUMN "telegramLastName" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_telegramChatId_key" ON "AuthSession"("telegramChatId");

-- CreateIndex
CREATE INDEX "AuthSession_telegramChatId_idx" ON "AuthSession"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
