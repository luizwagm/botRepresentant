import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";
import { getAiSettings, saveAiSettings, type AiSettings } from "@/lib/outreach/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getAiSettings());
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json()) as Partial<AiSettings>;
  const before = await getAiSettings();

  const patch: Partial<AiSettings> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.tone === "string") patch.tone = body.tone;
  if (typeof body.scriptGuidance === "string") patch.scriptGuidance = body.scriptGuidance;
  for (const k of [
    "dailyCap",
    "minGapSeconds",
    "maxGapSeconds",
    "windowStartHour",
    "windowEndHour",
  ] as const) {
    const v = body[k];
    if (typeof v === "number" && Number.isFinite(v)) patch[k] = Math.trunc(v);
  }
  if (typeof body.sendOnWeekends === "boolean") patch.sendOnWeekends = body.sendOnWeekends;

  const saved = await saveAiSettings(patch);

  // Ligar/desligar a automação é a ação mais sensível do sistema — sempre auditada.
  if (before.enabled !== saved.enabled) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "ATUALIZAR",
      entityType: "AiSettings",
      entityId: "ai",
      summary: saved.enabled ? "LIGOU a automação de prospecção" : "DESLIGOU a automação de prospecção",
      ip: getIp(req),
    });
  }

  return NextResponse.json(saved);
}
