-- AlterTable
ALTER TABLE "ad_creatives" ADD COLUMN     "is_validation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "is_validation" BOOLEAN NOT NULL DEFAULT false;
