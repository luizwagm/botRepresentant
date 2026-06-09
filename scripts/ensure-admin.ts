// Semeia o admin inicial a partir do .env (ADMIN_EMAIL / ADMIN_PASSWORD).
// Idempotente: se o admin já existe, não faz nada.
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { env } from "../src/lib/env";

async function main(): Promise<void> {
  const email = env.adminEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin já existe: ${email} (papel ${existing.role}, ativo=${existing.active})`);
  } else {
    const passwordHash = await hashPassword(env.adminPassword);
    const u = await prisma.user.create({
      data: { email, passwordHash, name: "Administrador", role: "ADMIN", active: true },
    });
    console.log(`Admin criado: ${u.email} (senha do .env)`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erro:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
