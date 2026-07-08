import { NextRequest, NextResponse } from "next/server";
import { huntCity } from "@/lib/hunter";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { city?: string; state?: string };
  const city = (body.city ?? "").trim();
  const state = (body.state ?? "").trim().toUpperCase();

  if (!city || !state) {
    return NextResponse.json({ error: "Cidade e estado são obrigatórios." }, { status: 400 });
  }
  if (state.length !== 2) {
    return NextResponse.json({ error: "UF inválida." }, { status: 400 });
  }

  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  try {
    const result = await huntCity(city, state);

    const actor = await getCurrentUser();
    await writeAudit({
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: "BUSCA",
      entityType: "Hunt",
      summary: `Buscou lojas em ${result.city}/${result.state}: +${result.inserted} novas (${result.skipped.alreadyListed} ja cadastradas)`,
      changes: {
        city: result.city,
        state: result.state,
        inserted: result.inserted,
        alreadyListed: result.skipped.alreadyListed,
        total: result.total,
        skipped: result.skipped,
      },
      ip: getIp(req),
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha na busca." },
      { status: 500 },
    );
  }
}
