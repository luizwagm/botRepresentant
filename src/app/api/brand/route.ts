import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";
import { BRAND_ID, DEFAULT_BRAND, getBrand, sanitizeLogoUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getBrand());
}

type PutBody = { logoUrl?: string | null; markUrl?: string | null };

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json()) as PutBody;
  // Só caminho de upload nosso: um logo apontando pra fora seria conteúdo de
  // terceiro no cabeçalho de todas as páginas.
  const data = {
    logoUrl: sanitizeLogoUrl(body.logoUrl),
    markUrl: sanitizeLogoUrl(body.markUrl),
  };

  try {
    const saved = await prisma.brandSettings.upsert({
      where: { id: BRAND_ID },
      create: { id: BRAND_ID, ...data },
      update: data,
    });

    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "ATUALIZAR",
      entityType: "BrandSettings",
      entityId: BRAND_ID,
      summary: "Atualizou a logomarca do sistema",
      ip: getIp(req),
    });

    return NextResponse.json({ logoUrl: saved.logoUrl, markUrl: saved.markUrl });
  } catch (e) {
    console.error("[marca] falha ao salvar:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Falha ao salvar. A migration da marca já foi aplicada?", ...DEFAULT_BRAND },
      { status: 400 },
    );
  }
}
