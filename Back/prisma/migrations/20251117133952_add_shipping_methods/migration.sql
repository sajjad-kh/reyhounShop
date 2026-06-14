-- AlterTable
ALTER TABLE "Address" ADD COLUMN "fullName" TEXT;
ALTER TABLE "Address" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "basalamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseCost" INTEGER NOT NULL,
    "additionalCost" INTEGER NOT NULL,
    "additionalDimensionsCost" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductShippingMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "shippingMethodId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductShippingMethod_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductShippingMethod_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalPrice" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "shippingCost" INTEGER NOT NULL,
    "addressId" INTEGER NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "trackingCode" TEXT,
    "shippingMethodId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("addressId", "createdAt", "discountAmount", "id", "paymentRef", "paymentStatus", "shippingCost", "status", "totalPrice", "trackingCode", "updatedAt", "userId") SELECT "addressId", "createdAt", "discountAmount", "id", "paymentRef", "paymentStatus", "shippingCost", "status", "totalPrice", "trackingCode", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_trackingCode_idx" ON "Order"("trackingCode");
CREATE INDEX "Order_shippingMethodId_idx" ON "Order"("shippingMethodId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShippingMethod_basalamId_key" ON "ShippingMethod"("basalamId");

-- CreateIndex
CREATE INDEX "ShippingMethod_basalamId_idx" ON "ShippingMethod"("basalamId");

-- CreateIndex
CREATE INDEX "ShippingMethod_isActive_idx" ON "ShippingMethod"("isActive");

-- CreateIndex
CREATE INDEX "ShippingMethod_lastSyncedAt_idx" ON "ShippingMethod"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "ProductShippingMethod_productId_idx" ON "ProductShippingMethod"("productId");

-- CreateIndex
CREATE INDEX "ProductShippingMethod_shippingMethodId_idx" ON "ProductShippingMethod"("shippingMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductShippingMethod_productId_shippingMethodId_key" ON "ProductShippingMethod"("productId", "shippingMethodId");
