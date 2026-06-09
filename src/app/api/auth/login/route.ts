import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signSession, setSessionCookie, type Role } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { writeAudit, getIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const ip = getIp(req);

  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = !!user && user.active && (await verifyPassword(password, user.passwordHash));

  if (!user || !valid) {
    await writeAudit({
      actorId: user?.id ?? null,
      actorEmail: email,
      action: "LOGIN_FALHOU",
      summary: `Tentativa de login falhou para ${email}`,
      ip,
    });
    // Mensagem genérica de propósito — não revela se o email existe ou está inativo.
    return NextResponse.json({ error: "Credenciais inválidas ou usuário inativo." }, { status: 401 });
  }

  const token = await signSession({
    userId: user.id,
    email: user.email,
    role: user.role as Role,
  });
  await setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "LOGIN",
    summary: `${user.name ?? user.email} entrou no sistema`,
    ip,
  });

  return NextResponse.json({ ok: true });
}
