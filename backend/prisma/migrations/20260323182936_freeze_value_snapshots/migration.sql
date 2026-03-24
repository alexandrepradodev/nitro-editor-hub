-- AlterTable
ALTER TABLE "ad_creatives" ADD COLUMN     "is_manual_value" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "line_total_value" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unit_value_snapshot" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "base_value_snapshot" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_manual_value" BOOLEAN NOT NULL DEFAULT false;
