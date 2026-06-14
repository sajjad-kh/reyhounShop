/*
  Warnings:

  - You are about to drop the `ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApiLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BankAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BasalamOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BasalamOrderStatusHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Discount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ErrorLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wishlist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `lat` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProofUrl` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paymentRef` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paymentRejectionReason` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `trackingCode` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `failureReason` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayTxnId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `basalamProductId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `lowStockAlert` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `reservedStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ProductShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `additionalCost` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `additionalDimensionsCost` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `basalamId` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `is2FAEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `loyaltyPoints` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFASecret` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ActivityLog_ip_idx";

-- DropIndex
DROP INDEX "ActivityLog_createdAt_idx";

-- DropIndex
DROP INDEX "ActivityLog_entity_idx";

-- DropIndex
DROP INDEX "ActivityLog_action_idx";

-- DropIndex
DROP INDEX "ActivityLog_userId_idx";

-- DropIndex
DROP INDEX "ApiLog_responseTime_idx";

-- DropIndex
DROP INDEX "ApiLog_ip_idx";

-- DropIndex
DROP INDEX "ApiLog_timestamp_idx";

-- DropIndex
DROP INDEX "ApiLog_status_idx";

-- DropIndex
DROP INDEX "ApiLog_endpoint_idx";

-- DropIndex
DROP INDEX "ApiLog_userId_idx";

-- DropIndex
DROP INDEX "BasalamOrder_createdAt_idx";

-- DropIndex
DROP INDEX "BasalamOrder_status_idx";

-- DropIndex
DROP INDEX "BasalamOrder_userId_idx";

-- DropIndex
DROP INDEX "BasalamOrder_basalamOrderId_key";

-- DropIndex
DROP INDEX "BasalamOrderStatusHistory_createdAt_idx";

-- DropIndex
DROP INDEX "BasalamOrderStatusHistory_orderId_idx";

-- DropIndex
DROP INDEX "Discount_code_key";

-- DropIndex
DROP INDEX "NotificationPreference_userId_key";

-- DropIndex
DROP INDEX "Review_createdAt_idx";

-- DropIndex
DROP INDEX "Review_rating_idx";

-- DropIndex
DROP INDEX "Review_isApproved_idx";

-- DropIndex
DROP INDEX "Review_userId_idx";

-- DropIndex
DROP INDEX "Review_productId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ActivityLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ApiLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BankAccount";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BasalamOrder";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BasalamOrderStatusHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Discount";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ErrorLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LoyaltyTransaction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Notification";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NotificationPreference";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PaymentTransaction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Review";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Wishlist";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "OrderDesignFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderDesignFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderDesignVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "designerId" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderDesignVersion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderDesignVersion_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DesignComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "userId" INTEGER,
    "message" TEXT NOT NULL,
    "isFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DesignComment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DesignComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Address" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Address" ("address", "city", "fullName", "id", "isDefault", "phone", "postalCode", "province", "title", "userId") SELECT "address", "city", "fullName", "id", "isDefault", "phone", "postalCode", "province", "title", "userId" FROM "Address";
DROP TABLE "Address";
ALTER TABLE "new_Address" RENAME TO "Address";
CREATE TABLE "new_Cart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Cart" ("id", "userId") SELECT "id", "userId" FROM "Cart";
DROP TABLE "Cart";
ALTER TABLE "new_Cart" RENAME TO "Cart";
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "totalPrice" INTEGER NOT NULL,
    "shippingCost" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "addressId" INTEGER NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'POST',
    "shippingMethodId" INTEGER,
    "designStatus" TEXT NOT NULL DEFAULT 'PENDING_DESIGN',
    "currentDesignVersionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_currentDesignVersionId_fkey" FOREIGN KEY ("currentDesignVersionId") REFERENCES "OrderDesignVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("addressId", "createdAt", "discountAmount", "id", "paymentStatus", "shippingCost", "shippingMethodId", "status", "totalPrice", "updatedAt", "userId") SELECT "addressId", "createdAt", "discountAmount", "id", "paymentStatus", "shippingCost", "shippingMethodId", "status", "totalPrice", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gateway" TEXT NOT NULL,
    "gatewayRef" TEXT,
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "gateway", "gatewayRef", "id", "orderId", "status") SELECT "amount", "createdAt", "gateway", "gatewayRef", "id", "orderId", "status" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "discountPrice" INTEGER,
    "stock" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "createdAt", "description", "discountPrice", "id", "name", "price", "slug", "stock", "updatedAt") SELECT "categoryId", "createdAt", "description", "discountPrice", "id", "name", "price", "slug", "stock", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE TABLE "new_ProductShippingMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "shippingMethodId" INTEGER NOT NULL,
    CONSTRAINT "ProductShippingMethod_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductShippingMethod_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductShippingMethod" ("id", "productId", "shippingMethodId") SELECT "id", "productId", "shippingMethodId" FROM "ProductShippingMethod";
DROP TABLE "ProductShippingMethod";
ALTER TABLE "new_ProductShippingMethod" RENAME TO "ProductShippingMethod";
CREATE UNIQUE INDEX "ProductShippingMethod_productId_shippingMethodId_key" ON "ProductShippingMethod"("productId", "shippingMethodId");
CREATE TABLE "new_ShippingMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "baseCost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_ShippingMethod" ("baseCost", "id", "isActive", "name") SELECT "baseCost", "id", "isActive", "name" FROM "ShippingMethod";
DROP TABLE "ShippingMethod";
ALTER TABLE "new_ShippingMethod" RENAME TO "ShippingMethod";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isActive", "name", "password", "phone", "role", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "name", "password", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
