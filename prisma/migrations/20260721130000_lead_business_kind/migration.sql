-- CreateEnum
CREATE TYPE "BusinessKind" AS ENUM ('FABRICANTE', 'VAREJISTA', 'INDEFINIDO');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "business_kind" "BusinessKind" NOT NULL DEFAULT 'INDEFINIDO';

-- CreateIndex
CREATE INDEX "leads_business_kind_idx" ON "leads"("business_kind");
