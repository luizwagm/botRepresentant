import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { writeAudit, getIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: USER_SELECT,
  });
  return NextResponse.json({ users });
}

type CreateBody = { email?: string; name?: string; password?: string; role?: string };

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim() || null;
  const password = body.password ?? "";
  const role = body.role === "ADMIN" ? "ADMIN" : "VENDEDOR";

  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Já existe um usuário com esse email." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role, active: true },
    select: USER_SELECT,
  });

  await writeAudit({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "CRIAR",
    entityType: "User",
    entityId: user.id,
    summary: `Criou usuário ${email} (${role})`,
    ip: getIp(req),
  });

  return NextResponse.json(user, { status: 201 });
}
