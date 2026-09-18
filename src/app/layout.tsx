import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Jost, Unbounded } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { OG_PADRAO, SITE } from "@/lib/site";

// Painel
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Loja: Unbounded é a geometria larga do "ROTA" da logo; Jost é o espaçamento
// limpo do "A T A C A D O". Duas famílias só — cada fonte a mais custa LCP.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// PUBLIC_BASE_URL malformado (sem protocolo, vazio) NÃO pode derrubar o site
// inteiro: isto é avaliado no import do módulo raiz.
function safeMetadataBase(raw: string): URL | undefined {
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return undefined;
    }
  }
}

export const metadata: Metadata = {
  metadataBase: safeMetadataBase(env.publicBaseUrl),
  title: { default: `${SITE.nome} — ${SITE.slogan}`, template: `%s | ${SITE.nome}` },
  description: SITE.descricao,
  applicationName: SITE.nome,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/rota/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/rota/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/rota/icone-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/rota/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: OG_PADRAO,
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: SITE.corTema,
  colorScheme: "dark light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
