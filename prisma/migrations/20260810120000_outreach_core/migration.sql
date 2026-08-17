-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('AGENDADO', 'ENVIADO', 'RESPONDEU', 'EM_NEGOCIACAO', 'ASSUMIDO_HUMANO', 'SEM_RESPOSTA', 'ENCERRADO', 'FALHOU');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "OutreachTaskStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU', 'CANCELADO');

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'AGENDADO',
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "human_owner_id" TEXT,
    "follow_up_stage" INTEGER NOT NULL DEFAULT 0,
    "next_action_at" TIMESTAMP(3),
    "last_inbound_at" TIMESTAMP(3),
    "last_outbound_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "via_ai" BOOLEAN NOT NULL DEFAULT false,
    "external_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_batches" (
    "id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_tasks" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT,
    "lead_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "OutreachTaskStatus" NOT NULL DEFAULT 'PENDENTE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tone" TEXT NOT NULL,
    "script_guidance" TEXT NOT NULL,
    "daily_cap" INTEGER NOT NULL DEFAULT 30,
    "min_gap_seconds" INTEGER NOT NULL DEFAULT 45,
    "max_gap_seconds" INTEGER NOT NULL DEFAULT 180,
    "window_start_hour" INTEGER NOT NULL DEFAULT 9,
    "window_end_hour" INTEGER NOT NULL DEFAULT 18,
    "send_on_weekends" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_lead_id_key" ON "conversations"("lead_id");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_next_action_at_idx" ON "conversations"("next_action_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_messages_external_id_key" ON "conversation_messages"("external_id");

-- CreateIndex
CREATE INDEX "conversation_messages_conversation_id_created_at_idx" ON "conversation_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "outreach_batches_scheduled_for_idx" ON "outreach_batches"("scheduled_for");

-- CreateIndex
CREATE INDEX "outreach_tasks_status_scheduled_for_idx" ON "outreach_tasks"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "outreach_tasks_lead_id_idx" ON "outreach_tasks"("lead_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_human_owner_id_fkey" FOREIGN KEY ("human_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_batches" ADD CONSTRAINT "outreach_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "outreach_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
