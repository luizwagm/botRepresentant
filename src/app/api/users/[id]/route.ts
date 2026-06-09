import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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

type PatchBody = {
  name?: string | null;
  role?: string;
  active?: boolean;
  password?: string;
};

async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", active: true } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "usuário não encontrado" }, { status: 404 });

  const isSelf = actor?.id === id;
  const targetRole = body.role === "ADMIN" ? "ADMIN" : body.role === "VENDEDOR" ? "VENDEDOR" : before.role;
  const targetActive = body.active === undefined ? before.active : body.active;

  // Proteções contra travar o próprio acesso / ficar sem admin
  if (isSelf && body.active === false) {
    return NextResponse.json({ error: "Você não pode desativar a si mesmo." }, { status: 400 });
  }
  if (isSelf && body.role === "VENDEDOR" && before.role === "ADMIN") {
    return NextResponse.json({ error: "Você não pode remover seu próprio acesso de administrador." }, { status: 400 });
  }
  const losesAdmin = before.role === "ADMIN" && before.active && (targetRole !== "ADMIN" || targetActive === false);
  if (losesAdmin && (await countActiveAdmins()) <= 1) {
    return NextResponse.json({ error: "Precisa existir ao menos um administrador ativo." }, { status: 400 });
  }

  const data: Prisma.UserUpdateInput = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (body.name !== undefined) {
    const v = body.name?.trim() || null;
    if (v !== before.name) changes.name = { from: before.name, to: v };
    data.name = v;
  }
  if (body.role !== undefined && targetRole !== before.role) {
    data.role = targetRole;
    changes.role = { from: before.role, to: targetRole };
  }
  if (body.active !== undefined && body.active !== before.active) {
    data.active = body.active;
    changes.active = { from: before.active, to: body.active };
  }
  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
    changes.password = { from: "***", to: "(redefinida)" }; // nunca registra a senha real
  }

  const updated = await prisma.user.update({ where: { id }, data, select: USER_SELECT });

  if (Object.keys(changes).length > 0) {
    await writeAudit({
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: "ATUALIZAR",
      entityType: "User",
      entityId: id,
      summary: `Atualizou usuário ${before.email}`,
      changes,
      ip: getIp(req),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  if (actor?.id === id) {
    return NextResponse.json({ error: "Você não pode excluir a si mesmo." }, { status: 400 });
  }

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "usuário não encontrado" }, { status: 404 });

  if (before.role === "ADMIN" && before.active && (await countActiveAdmins()) <= 1) {
    return NextResponse.json({ error: "Precisa existir ao menos um administrador ativo." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  await writeAudit({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "EXCLUIR",
    entityType: "User",
    entityId: id,
    summary: `Excluiu usuário ${before.email}`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true });
}
