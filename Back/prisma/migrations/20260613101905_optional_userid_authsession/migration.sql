-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuthSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuthSession" ("createdAt", "expiresAt", "id", "status", "userId") SELECT "createdAt", "expiresAt", "id", "status", "userId" FROM "AuthSession";
DROP TABLE "AuthSession";
ALTER TABLE "new_AuthSession" RENAME TO "AuthSession";
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL DEFAULT 'EMAIL',
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "is2FAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFASecret" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "baleChatId" TEXT,
    "baleUsername" TEXT,
    "baleFirstName" TEXT,
    "baleConnectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("baleChatId", "baleConnectedAt", "baleFirstName", "baleUsername", "createdAt", "email", "id", "is2FAEnabled", "isActive", "loyaltyPoints", "name", "password", "phone", "role", "twoFASecret", "updatedAt") SELECT "baleChatId", "baleConnectedAt", "baleFirstName", "baleUsername", "createdAt", "email", "id", "is2FAEnabled", "isActive", "loyaltyPoints", "name", "password", "phone", "role", "twoFASecret", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_baleChatId_key" ON "User"("baleChatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
