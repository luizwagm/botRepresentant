import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateFirstContactMessage } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });

  try {
    const message = await generateFirstContactMessage({
      name: lead.name,
      city: lead.city,
      state: lead.state,
      storeType: lead.storeType,
    });
    return NextResponse.json({ message });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao gerar mensagem" },
      { status: 500 },
    );
  }
}
