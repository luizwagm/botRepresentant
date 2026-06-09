import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  await clearSessionCookie();
  if (user) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "LOGOUT",
      summary: `${user.name ?? user.email} saiu do sistema`,
    });
  }
  return NextResponse.json({ ok: true });
}
