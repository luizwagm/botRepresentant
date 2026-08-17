import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
const COOKIE_NAME = "jh_session";

// Rotas que NÃO exigem login
const PUBLIC_PREFIXES = [
  "/login",
  "/catalogo/publico",
  "/sobre",
  "/api/auth/login",
  "/api/auth/logout",
  "/uploads",
];

// Rotas só pra ADMIN
// /prospeccao e /api/outreach são de ADMIN: quem edita o tom/roteiro está
// reescrevendo o que a IA fala com cliente real em nome da fábrica, e quem
// liga a chave dispara mensagem de verdade.
const ADMIN_PREFIXES = [
  "/usuarios",
  "/auditoria",
  "/prospeccao",
  "/api/users",
  "/api/audit",
  "/api/outreach",
];

function matches(pathname: string, list: string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (matches(pathname, PUBLIC_PREFIXES)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let authed = false;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      authed = true;
      role = typeof payload.role === "string" ? payload.role : null;
    } catch {
      authed = false;
    }
  }

  if (!authed) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (matches(pathname, ADMIN_PREFIXES) && role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|logo-mark.svg|logo-horizontal.svg|logo-whatsapp.png|logo-whatsapp-500.png|next.svg|vercel.svg|file.svg|globe.svg|window.svg).*)",
  ],
};
