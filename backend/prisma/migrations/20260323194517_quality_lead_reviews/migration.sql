-- CreateTable
CREATE TABLE "quality_reviews" (
    "id" TEXT NOT NULL,
    "ad_creative_id" TEXT NOT NULL,
    "note_percent" INTEGER,
    "observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quality_reviews_ad_creative_id_key" ON "quality_reviews"("ad_creative_id");

-- CreateIndex
CREATE INDEX "quality_reviews_note_percent_idx" ON "quality_reviews"("note_percent");

-- AddForeignKey
ALTER TABLE "quality_reviews" ADD CONSTRAINT "quality_reviews_ad_creative_id_fkey" FOREIGN KEY ("ad_creative_id") REFERENCES "ad_creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
