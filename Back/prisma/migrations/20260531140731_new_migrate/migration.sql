/*
  Warnings:

  - You are about to drop the column `stack` on the `ErrorLog` table. All the data in the column will be lost.
  - You are about to drop the column `statusCode` on the `ErrorLog` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `ErrorLog` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `ErrorLog` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ErrorLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message" TEXT NOT NULL,
    "endpoint" TEXT,
    "method" TEXT,
    "ip" TEXT,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ErrorLog" ("endpoint", "id", "ip", "message", "method", "userId") SELECT "endpoint", "id", "ip", "message", "method", "userId" FROM "ErrorLog";
DROP TABLE "ErrorLog";
ALTER TABLE "new_ErrorLog" RENAME TO "ErrorLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
