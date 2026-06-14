-- CreateTable
CREATE TABLE "BasalamOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "basalamOrderId" INTEGER NOT NULL,
    "orderNumber" TEXT,
    "status" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "shippingAddressJson" TEXT NOT NULL,
    "contactInfoJson" TEXT NOT NULL,
    "paymentUrl" TEXT,
    "paymentTransactionId" TEXT,
    "trackingCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "paidAt" DATETIME,
    CONSTRAINT "BasalamOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BasalamOrderStatusHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BasalamOrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BasalamOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BasalamOrder_basalamOrderId_key" ON "BasalamOrder"("basalamOrderId");

-- CreateIndex
CREATE INDEX "BasalamOrder_userId_idx" ON "BasalamOrder"("userId");

-- CreateIndex
CREATE INDEX "BasalamOrder_status_idx" ON "BasalamOrder"("status");

-- CreateIndex
CREATE INDEX "BasalamOrder_createdAt_idx" ON "BasalamOrder"("createdAt");

-- CreateIndex
CREATE INDEX "BasalamOrderStatusHistory_orderId_idx" ON "BasalamOrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "BasalamOrderStatusHistory_createdAt_idx" ON "BasalamOrderStatusHistory"("createdAt");
