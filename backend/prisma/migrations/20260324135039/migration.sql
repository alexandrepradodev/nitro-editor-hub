-- CreateEnum
CREATE TYPE "ClosingPeriodStatus" AS ENUM ('Open', 'Closed');

-- CreateTable
CREATE TABLE "closing_periods" (
    "id" TEXT NOT NULL,
    "month_key" TEXT NOT NULL,
    "status" "ClosingPeriodStatus" NOT NULL DEFAULT 'Closed',
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_by_user_id" TEXT NOT NULL,
    "pending_deliveries" INTEGER NOT NULL DEFAULT 0,
    "pending_alert_message" TEXT NOT NULL DEFAULT '',
    "total_salary_cents" INTEGER NOT NULL DEFAULT 0,
    "total_bonus_cents" INTEGER NOT NULL DEFAULT 0,
    "total_net_cents" INTEGER NOT NULL DEFAULT 0,
    "deliveries_count" INTEGER NOT NULL DEFAULT 0,
    "vsl_lead_ml_upsell_count" INTEGER NOT NULL DEFAULT 0,
    "ad_creatives_count" INTEGER NOT NULL DEFAULT 0,
    "quality_batches_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "closing_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closing_editor_snapshots" (
    "id" TEXT NOT NULL,
    "closing_period_id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "color_class" TEXT NOT NULL,
    "production_type" TEXT,
    "salary_cents" INTEGER NOT NULL DEFAULT 0,
    "delivery_bonus_cents" INTEGER NOT NULL DEFAULT 0,
    "ad_bonus_cents" INTEGER NOT NULL DEFAULT 0,
    "quality_bonus_cents" INTEGER NOT NULL DEFAULT 0,
    "subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "net_total_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "closing_editor_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "closing_periods_month_key_key" ON "closing_periods"("month_key");

-- CreateIndex
CREATE INDEX "closing_periods_month_key_idx" ON "closing_periods"("month_key");

-- CreateIndex
CREATE INDEX "closing_periods_closed_at_idx" ON "closing_periods"("closed_at");

-- CreateIndex
CREATE INDEX "closing_editor_snapshots_closing_period_id_idx" ON "closing_editor_snapshots"("closing_period_id");

-- CreateIndex
CREATE INDEX "closing_editor_snapshots_editor_id_idx" ON "closing_editor_snapshots"("editor_id");

-- AddForeignKey
ALTER TABLE "closing_editor_snapshots" ADD CONSTRAINT "closing_editor_snapshots_closing_period_id_fkey" FOREIGN KEY ("closing_period_id") REFERENCES "closing_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
