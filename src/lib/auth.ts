import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";
import { prisma } from "./db";

const SECRET = new TextEncoder().encode(env.authSecret);
const COOKIE_NAME = "jh_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

export type Role = "ADMIN" | "VENDEDOR";
export type SessionPayload = { userId: string; email: string; role: Role };

export async function signSession(p: SessionPayload): Promise<string> {
  return await new SignJWT({ email: p.email, role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    const role: Role = payload.role === "ADMIN" ? "ADMIN" : "VENDEDOR";
    return { userId: payload.sub, email: payload.email, role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const tok = c.get(COOKIE_NAME)?.value;
  if (!tok) return null;
  return await verifySession(tok);
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

/**
 * Resolve o usuário logado validando contra o banco (existe E está ativo).
 * Use em rotas/layout quando precisar do ator real ou checar status.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await getSession();
  if (!s) return null;
  const u = await prisma.user.findUnique({ where: { id: s.userId } });
  if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role as Role };
}

export async function setSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
