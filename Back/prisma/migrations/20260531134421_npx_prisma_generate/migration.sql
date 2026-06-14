/*
  Warnings:

  - You are about to drop the column `path` on the `ErrorLog` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ErrorLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "userId" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "statusCode" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ErrorLog" ("createdAt", "id", "message", "method", "stack") SELECT "createdAt", "id", "message", "method", "stack" FROM "ErrorLog";
DROP TABLE "ErrorLog";
ALTER TABLE "new_ErrorLog" RENAME TO "ErrorLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
