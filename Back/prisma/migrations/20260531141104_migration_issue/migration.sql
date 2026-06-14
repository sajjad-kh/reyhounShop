-- AlterTable
ALTER TABLE "ErrorLog" ADD COLUMN "stack" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN "statusCode" INTEGER;
ALTER TABLE "ErrorLog" ADD COLUMN "userAgent" TEXT;
