-- CreateEnum
CREATE TYPE "FunnelStage" AS ENUM ('NOVO_LEAD', 'MENSAGEM_ENVIADA', 'RESPONDEU', 'EM_NEGOCIACAO', 'CATALOGO_ENVIADO', 'PEDIDO_FEITO', 'CLIENTE', 'SEM_RESPOSTA', 'RECUSOU', 'PAUSADO');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('MODA', 'FEMININA', 'MASCULINA', 'JEANS', 'MULTIMARCA', 'MISTA', 'OUTROS');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "store_type" "StoreType" NOT NULL DEFAULT 'OUTROS',
    "responsible_name" TEXT,
    "founded_at" TIMESTAMP(3),
    "funnel_stage" "FunnelStage" NOT NULL DEFAULT 'NOVO_LEAD',
    "notes" TEXT,
    "opt_out" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "sizes" TEXT[],
    "wholesale_price_min" DOUBLE PRECISION,
    "wholesale_price_max" DOUBLE PRECISION,
    "retail_price" DOUBLE PRECISION,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_place_id_key" ON "leads"("place_id");

-- CreateIndex
CREATE INDEX "leads_city_state_idx" ON "leads"("city", "state");

-- CreateIndex
CREATE INDEX "leads_state_idx" ON "leads"("state");

-- CreateIndex
CREATE INDEX "leads_store_type_idx" ON "leads"("store_type");

-- CreateIndex
CREATE INDEX "leads_funnel_stage_idx" ON "leads"("funnel_stage");

-- CreateIndex
CREATE INDEX "message_logs_lead_id_idx" ON "message_logs"("lead_id");

-- CreateIndex
CREATE INDEX "products_active_idx" ON "products"("active");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
