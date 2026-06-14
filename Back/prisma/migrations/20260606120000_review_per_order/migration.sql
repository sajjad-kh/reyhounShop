-- Drop old unique constraint (one review per user per product)
DROP INDEX IF EXISTS "Review_userId_productId_key";

-- Add orderId to link reviews to specific orders
ALTER TABLE "Review" ADD COLUMN "orderId" INTEGER;

-- CreateTable for foreign key (SQLite rebuild)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "approvedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Review_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Review" ("id", "productId", "userId", "orderId", "rating", "comment", "isApproved", "approvedAt", "approvedBy", "createdAt")
SELECT "id", "productId", "userId", NULL, "rating", "comment", "isApproved", "approvedAt", "approvedBy", "createdAt"
FROM "Review";

DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";

CREATE UNIQUE INDEX "Review_userId_productId_orderId_key" ON "Review"("userId", "productId", "orderId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
