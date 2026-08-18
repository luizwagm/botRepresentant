import { NextResponse } from "next/server";
import { diagnosticar } from "@/lib/outreach/diagnostics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Por que a fila não anda — respondido na tela, sem precisar de log no servidor. */
export async function GET() {
  try {
    return NextResponse.json(await diagnosticar());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao diagnosticar" },
      { status: 500 },
    );
  }
}
