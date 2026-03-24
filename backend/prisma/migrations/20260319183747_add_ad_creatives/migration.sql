-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "projeto" TEXT NOT NULL,
    "leva" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL DEFAULT 'FB',
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "task_code" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_creatives_editor_id_idx" ON "ad_creatives"("editor_id");

-- CreateIndex
CREATE INDEX "ad_creatives_date_idx" ON "ad_creatives"("date");

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "editors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
