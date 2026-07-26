-- Add Discount model for promo codes
CREATE TABLE "Discount" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "minPurchase" INTEGER,
  "maxUses" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "applicableTo" TEXT NOT NULL DEFAULT 'all',
  "expiresAt" DATETIME,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");
