import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";
import { readChannelStatus, requestLogout } from "@/lib/outreach/channel-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** O QR do WhatsApp expira em ~20s; o painel repete a busca de poucos em poucos segundos. */
export async function GET() {
  const snap = await readChannelStatus();

  // Converte o payload cru num SVG pronto pra exibir. O QR só existe enquanto
  // o worker está esperando leitura.
  let qrSvg: string | null = null;
  if (snap.state === "AGUARDANDO_QR" && snap.qr) {
    try {
      qrSvg = await QRCode.toString(snap.qr, {
        type: "svg",
        margin: 1,
        width: 288,
        errorCorrectionLevel: "M",
      });
    } catch {
      qrSvg = null;
    }
  }

  return NextResponse.json({
    state: snap.state,
    workerOnline: snap.workerOnline,
    connectedPhone: snap.connectedPhone,
    connectedAt: snap.connectedAt,
    lastError: snap.lastError,
    heartbeatAt: snap.heartbeatAt,
    qrUpdatedAt: snap.qrUpdatedAt,
    qrSvg,
  });
}

type PostBody = { action?: string };

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as PostBody;
  if (body.action !== "desconectar") {
    return NextResponse.json({ error: "ação desconhecida" }, { status: 400 });
  }

  await requestLogout();
  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "ATUALIZAR",
    entityType: "ChannelStatus",
    entityId: "wa",
    summary: "Pediu desconexão do WhatsApp (novo QR)",
    ip: getIp(req),
  });

  return NextResponse.json({
    ok: true,
    aviso: "O worker desconecta em até ~1 minuto e gera um QR novo.",
  });
}
