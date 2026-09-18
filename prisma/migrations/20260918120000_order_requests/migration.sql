-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NOVO', 'EM_ATENDIMENTO', 'FECHADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "order_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NOVO',
    "store_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "whatsapp" TEXT,
    "city" TEXT,
    "state" CHAR(2),
    "cnpj" TEXT,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "total_pieces" INTEGER NOT NULL,
    "estimate_min" DOUBLE PRECISION,
    "estimate_max" DOUBLE PRECISION,
    "lead_id" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_requests_code_key" ON "order_requests"("code");

-- CreateIndex
CREATE INDEX "order_requests_status_idx" ON "order_requests"("status");

-- CreateIndex
CREATE INDEX "order_requests_created_at_idx" ON "order_requests"("created_at");

-- CreateIndex
CREATE INDEX "order_requests_lead_id_idx" ON "order_requests"("lead_id");

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
