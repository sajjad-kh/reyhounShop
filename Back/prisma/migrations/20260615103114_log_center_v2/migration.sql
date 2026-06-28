/*
  Warnings:

  - You are about to drop the column `details` on the `ActivityLog` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "targetUserId" INTEGER,
    "orderId" INTEGER,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "correlationId" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivityLog" ("action", "actorType", "createdAt", "entity", "entityId", "id", "ip", "orderId", "userAgent", "userId") SELECT "action", "actorType", "createdAt", "entity", "entityId", "id", "ip", "orderId", "userAgent", "userId" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_targetUserId_idx" ON "ActivityLog"("targetUserId");
CREATE INDEX "ActivityLog_orderId_idx" ON "ActivityLog"("orderId");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX "ActivityLog_entity_idx" ON "ActivityLog"("entity");
CREATE INDEX "ActivityLog_severity_idx" ON "ActivityLog"("severity");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "ActivityLog_correlationId_idx" ON "ActivityLog"("correlationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
