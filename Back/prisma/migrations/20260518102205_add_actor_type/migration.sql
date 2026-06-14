/*
  Warnings:

  - Added the required column `actorType` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentRejectionReason" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivityLog" ("action", "createdAt", "details", "entity", "entityId", "id", "ip", "userAgent", "userId") SELECT "action", "createdAt", "details", "entity", "entityId", "id", "ip", "userAgent", "userId" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE TABLE "new_OrderMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "userId" INTEGER,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderMessage" ("createdAt", "id", "isAdmin", "message", "orderId", "type", "userId") SELECT "createdAt", "id", "isAdmin", "message", "orderId", "type", "userId" FROM "OrderMessage";
DROP TABLE "OrderMessage";
ALTER TABLE "new_OrderMessage" RENAME TO "OrderMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
