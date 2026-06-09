import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summary: string;
  changes?: unknown;
  ip?: string | null;
};

/**
 * Grava um registro de auditoria. NUNCA lança — uma falha de auditoria não
 * pode derrubar a ação principal (só loga no console).
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        summary: input.summary,
        changes:
          input.changes === undefined || input.changes === null
            ? undefined
            : (input.changes as Prisma.InputJsonValue),
        ip: input.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] falhou:", e instanceof Error ? e.message : e);
  }
}

export function getIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  const real = req.headers.get("x-real-ip");
  return real ?? null;
}

/**
 * Compara before x after e retorna só os campos que mudaram, como { campo: {from, to} }.
 * Datas são normalizadas pra ISO na comparação.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    const b = before[key];
    const a = after[key];
    const bn = b instanceof Date ? b.toISOString() : b;
    const an = a instanceof Date ? a.toISOString() : a;
    if (JSON.stringify(bn ?? null) !== JSON.stringify(an ?? null)) {
      changes[key] = { from: b ?? null, to: a ?? null };
    }
  }
  return changes;
}
