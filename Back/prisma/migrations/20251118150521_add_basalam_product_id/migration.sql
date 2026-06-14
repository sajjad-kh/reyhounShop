/*
  Warnings:

  - A unique constraint covering the columns `[basalamProductId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN "basalamProductId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Product_basalamProductId_key" ON "Product"("basalamProductId");

-- CreateIndex
CREATE INDEX "Product_basalamProductId_idx" ON "Product"("basalamProductId");
