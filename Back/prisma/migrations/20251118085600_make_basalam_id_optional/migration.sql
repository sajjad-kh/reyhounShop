-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShippingMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "basalamId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseCost" INTEGER NOT NULL,
    "additionalCost" INTEGER NOT NULL,
    "additionalDimensionsCost" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShippingMethod" ("additionalCost", "additionalDimensionsCost", "basalamId", "baseCost", "createdAt", "description", "id", "isActive", "isPrivate", "lastSyncedAt", "name", "updatedAt") SELECT "additionalCost", "additionalDimensionsCost", "basalamId", "baseCost", "createdAt", "description", "id", "isActive", "isPrivate", "lastSyncedAt", "name", "updatedAt" FROM "ShippingMethod";
DROP TABLE "ShippingMethod";
ALTER TABLE "new_ShippingMethod" RENAME TO "ShippingMethod";
CREATE UNIQUE INDEX "ShippingMethod_basalamId_key" ON "ShippingMethod"("basalamId");
CREATE INDEX "ShippingMethod_basalamId_idx" ON "ShippingMethod"("basalamId");
CREATE INDEX "ShippingMethod_isActive_idx" ON "ShippingMethod"("isActive");
CREATE INDEX "ShippingMethod_lastSyncedAt_idx" ON "ShippingMethod"("lastSyncedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
