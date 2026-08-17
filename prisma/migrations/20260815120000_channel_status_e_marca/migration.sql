-- CreateEnum
CREATE TYPE "ChannelState" AS ENUM ('DESCONECTADO', 'AGUARDANDO_QR', 'CONECTADO');

-- CreateTable
CREATE TABLE "channel_status" (
    "id" TEXT NOT NULL,
    "state" "ChannelState" NOT NULL DEFAULT 'DESCONECTADO',
    "qr" TEXT,
    "qr_updated_at" TIMESTAMP(3),
    "connected_phone" TEXT,
    "connected_at" TIMESTAMP(3),
    "last_error" TEXT,
    "heartbeat_at" TIMESTAMP(3),
    "logout_requested" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_settings" (
    "id" TEXT NOT NULL,
    "logo_url" TEXT,
    "mark_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id")
);
