/*
  Warnings:

  - A unique constraint covering the columns `[baleChatId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "baleChatId" TEXT;
ALTER TABLE "User" ADD COLUMN "baleConnectedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "baleFirstName" TEXT;
ALTER TABLE "User" ADD COLUMN "baleUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_baleChatId_key" ON "User"("baleChatId");
