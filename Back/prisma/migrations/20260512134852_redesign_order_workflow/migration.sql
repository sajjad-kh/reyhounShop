/*
  Warnings:

  - Added the required column `updatedAt` to the `ShippingMethod` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "scheduledAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "discountPrice" INTEGER,
    "stock" INTEGER NOT NULL,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "categoryId" INTEGER NOT NULL,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "createdAt", "description", "discountPrice", "id", "name", "price", "slug", "stock", "updatedAt") SELECT "categoryId", "createdAt", "description", "discountPrice", "id", "name", "price", "slug", "stock", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE TABLE "new_ShippingMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "basalamId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseCost" INTEGER NOT NULL,
    "additionalCost" INTEGER NOT NULL DEFAULT 0,
    "additionalDimensionsCost" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShippingMethod" ("baseCost", "id", "isActive", "name") SELECT "baseCost", "id", "isActive", "name" FROM "ShippingMethod";
DROP TABLE "ShippingMethod";
ALTER TABLE "new_ShippingMethod" RENAME TO "ShippingMethod";
CREATE UNIQUE INDEX "ShippingMethod_basalamId_key" ON "ShippingMethod"("basalamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
