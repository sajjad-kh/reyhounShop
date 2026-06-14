-- AlterTable
ALTER TABLE "ApiLog" ADD COLUMN "responseTime" INTEGER;

-- AlterTable
ALTER TABLE "ErrorLog" ADD COLUMN "ip" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN "statusCode" INTEGER;
ALTER TABLE "ErrorLog" ADD COLUMN "userAgent" TEXT;
