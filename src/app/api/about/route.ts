import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit, getIp } from "@/lib/audit";
import {
  ABOUT_ID,
  DEFAULT_ABOUT,
  readHighlights,
  readStats,
  type AboutContent,
} from "@/lib/about";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function currentContent(): Promise<AboutContent> {
  const row = await prisma.aboutPage.findUnique({ where: { id: ABOUT_ID } });
  if (!row) return DEFAULT_ABOUT;
  return {
    heroTitle: row.heroTitle,
    heroSubtitle: row.heroSubtitle,
    storyHtml: row.storyHtml,
    highlights: readHighlights(row.highlights),
    stats: readStats(row.stats),
    imageUrl: row.imageUrl,
  };
}

// GET exige login (via proxy.ts, /api/about NAO esta em PUBLIC_PREFIXES): o unico
// consumidor e o painel /conteudo (autenticado). A pagina publica /sobre le o
// Prisma direto, entao nao precisa deste endpoint aberto.
export async function GET() {
  const content = await currentContent();
  return NextResponse.json(content);
}

type PutBody = {
  heroTitle?: string;
  heroSubtitle?: string;
  storyHtml?: string;
  highlights?: unknown;
  stats?: unknown;
  imageUrl?: string | null;
};

export async function PUT(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json()) as PutBody;
  if (!body.heroTitle?.trim()) {
    return NextResponse.json({ error: "O título é obrigatório." }, { status: 400 });
  }

  const content = {
    heroTitle: body.heroTitle.trim(),
    heroSubtitle: (body.heroSubtitle ?? "").trim(),
    storyHtml: body.storyHtml ?? "",
    // readHighlights/readStats normalizam e descartam entradas vazias/invalidas.
    highlights: readHighlights(body.highlights) as unknown as Prisma.InputJsonValue,
    stats: readStats(body.stats) as unknown as Prisma.InputJsonValue,
    imageUrl: body.imageUrl?.trim() || null,
  };

  try {
    const saved = await prisma.aboutPage.upsert({
      where: { id: ABOUT_ID },
      create: { id: ABOUT_ID, ...content },
      update: content,
    });

    const actor = await getCurrentUser();
    await writeAudit({
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: "ATUALIZAR",
      entityType: "AboutPage",
      entityId: ABOUT_ID,
      summary: "Atualizou a página Sobre nós",
      ip: getIp(req),
    });

    return NextResponse.json({
      heroTitle: saved.heroTitle,
      heroSubtitle: saved.heroSubtitle,
      storyHtml: saved.storyHtml,
      highlights: readHighlights(saved.highlights),
      stats: readStats(saved.stats),
      imageUrl: saved.imageUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao salvar." },
      { status: 400 },
    );
  }
}
