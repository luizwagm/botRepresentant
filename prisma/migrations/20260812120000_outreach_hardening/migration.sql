-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "follow_up_failures" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "outreach_tasks" ADD COLUMN     "claimed_at" TIMESTAMP(3);
