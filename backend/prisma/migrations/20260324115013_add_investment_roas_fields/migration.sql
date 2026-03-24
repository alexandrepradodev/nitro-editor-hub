-- AlterTable
ALTER TABLE "ad_creatives" ADD COLUMN     "investment_usd" DOUBLE PRECISION,
ADD COLUMN     "roas" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "investment_usd" DOUBLE PRECISION,
ADD COLUMN     "roas" DOUBLE PRECISION;
