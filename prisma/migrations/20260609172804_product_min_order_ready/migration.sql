-- AlterTable
ALTER TABLE "products" ADD COLUMN     "min_order_qty" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "ready_to_ship" BOOLEAN NOT NULL DEFAULT true;
