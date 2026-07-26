-- Add loyalty point redemption fields to Order
ALTER TABLE "Order" ADD COLUMN "loyaltyPointsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "loyaltyDiscount" INTEGER NOT NULL DEFAULT 0;
