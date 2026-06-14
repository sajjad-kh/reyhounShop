-- CreateTable
CREATE TABLE "BankAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankName" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "sheba" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
