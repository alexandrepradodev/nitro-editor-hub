-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('VSL', 'Lead', 'ML', 'Troca', 'Upsell');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('Avaliado', 'Pendente', 'Fallback', 'Fixo');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "color_class" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_rates" (
    "id" TEXT NOT NULL,
    "type" "DeliveryType" NOT NULL,
    "base_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "task_id" TEXT,
    "type" "DeliveryType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "retrabalho" INTEGER,
    "qualidade" INTEGER,
    "prazo" INTEGER,
    "kpi_total" INTEGER,
    "tier_label" TEXT,
    "bonus_calculated" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_editors" (
    "delivery_id" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_editors_pkey" PRIMARY KEY ("delivery_id","editor_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "editors_initials_key" ON "editors"("initials");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_rates_type_key" ON "delivery_rates"("type");

-- CreateIndex
CREATE INDEX "deliveries_type_idx" ON "deliveries"("type");

-- CreateIndex
CREATE INDEX "deliveries_date_idx" ON "deliveries"("date");

-- CreateIndex
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");

-- AddForeignKey
ALTER TABLE "delivery_editors" ADD CONSTRAINT "delivery_editors_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_editors" ADD CONSTRAINT "delivery_editors_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "editors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
