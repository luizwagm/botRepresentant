-- AlterTable
ALTER TABLE "conversation_messages" ADD COLUMN     "delivery_status" TEXT,
ADD COLUMN     "delivery_error" TEXT;
