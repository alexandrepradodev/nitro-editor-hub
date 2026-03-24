-- CreateEnum
CREATE TYPE "QualityLevaFormat" AS ENUM ('IG', 'GO', 'YT', 'FB');

-- CreateTable
CREATE TABLE "quality_batches" (
    "id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "month_key" TEXT NOT NULL,
    "total_levas" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,
    "max_points" INTEGER NOT NULL,
    "accuracy_percent" INTEGER NOT NULL,
    "bonus_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_batch_items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "leva_number" TEXT NOT NULL,
    "format" "QualityLevaFormat" NOT NULL,
    "note" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quality_batches_month_key_idx" ON "quality_batches"("month_key");

-- CreateIndex
CREATE INDEX "quality_batches_editor_id_month_key_idx" ON "quality_batches"("editor_id", "month_key");

-- CreateIndex
CREATE INDEX "quality_batch_items_batch_id_idx" ON "quality_batch_items"("batch_id");

-- AddForeignKey
ALTER TABLE "quality_batches" ADD CONSTRAINT "quality_batches_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "editors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_batch_items" ADD CONSTRAINT "quality_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "quality_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
