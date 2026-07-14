-- CreateTable
CREATE TABLE IF NOT EXISTS "TourStep" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "page" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "placement" TEXT NOT NULL DEFAULT 'bottom',
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
