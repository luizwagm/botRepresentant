import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
const COOKIE_NAME = "jh_session";

// Rotas que NÃO exigem login.
// Atenção: "/" aqui casa SÓ a raiz (matches() compara igualdade ou "p/"), então
// liberar a home da loja não abre o painel.
const PUBLIC_PREFIXES = [
  // Loja
  "/",
  "/loja",
  "/produto",
  "/carrinho",
  "/sobre",
  "/politica-de-privacidade",
  "/termos",
  "/catalogo/publico", // links antigos: o next.config redireciona pra /loja e /produto
  // Arquivos públicos que passam pelo proxy
  "/rota", // ativos da marca (public/rota)
  "/uploads",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  // APIs públicas
  "/api/loja", // pedido do carrinho
  "/api/auth/login",
  "/api/auth/logout",
  "/login",
];

// Área do painel (login obrigatório). Tudo que for página e NÃO estiver aqui
// nem em PUBLIC_PREFIXES segue pro Next — que responde com o 404 da loja em vez
// de jogar o cliente na tela de login. As páginas do painel têm ainda uma
// segunda trava no próprio layout (app/(painel)/layout.tsx).
const PAINEL_PREFIXES = [
  "/painel",
  "/pedidos",
  "/leads",
  "/funil",
  "/prospeccao",
  "/catalogo",
  "/fornecedores",
  "/conteudo",
  "/marca",
  "/usuarios",
  "/auditoria",
];

/** Cabeçalho com o caminho real, lido pela trava do layout do painel. */
const CABECALHO_CAMINHO = "x-rota-caminho";

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

  // Sempre SOBRESCREVE (nunca confia no que o cliente mandou com esse nome).
  const cabecalhos = new Headers(req.headers);
  cabecalhos.set(CABECALHO_CAMINHO, pathname);
  const seguir = () => NextResponse.next({ request: { headers: cabecalhos } });

  if (matches(pathname, PUBLIC_PREFIXES)) {
    return seguir();
  }

  // API é sempre "fechada por padrão"; página só se for do painel.
  const protegido = pathname.startsWith("/api/") || matches(pathname, PAINEL_PREFIXES);
  if (!protegido) {
    return seguir();
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
    // Sem permissão: volta pro início do PAINEL ("/" agora é a loja pública).
    return NextResponse.redirect(new URL("/painel", req.url));
  }

  return seguir();
}

export const config = {
  matcher: [
    // Arquivos estáticos (Next e a marca em public/rota) nem passam pelo proxy.
    "/((?!_next/static|_next/image|favicon.ico|rota/|next.svg|vercel.svg|file.svg|globe.svg|window.svg).*)",
  ],
};
