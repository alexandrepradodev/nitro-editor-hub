-- CreateEnum
CREATE TYPE "AdCreativeMediaType" AS ENUM ('Video', 'Image');

-- AlterTable
ALTER TABLE "ad_creatives" ADD COLUMN     "media_type" "AdCreativeMediaType" NOT NULL DEFAULT 'Image';

-- CreateTable
CREATE TABLE "ad_creative_rates" (
    "id" TEXT NOT NULL,
    "media_type" "AdCreativeMediaType" NOT NULL,
    "base_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_creative_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_creative_rates_media_type_key" ON "ad_creative_rates"("media_type");
