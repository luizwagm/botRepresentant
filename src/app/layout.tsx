import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import SiteHeader from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// PUBLIC_BASE_URL malformado (sem protocolo, vazio) NAO pode derrubar o site inteiro:
// isto e o metadata do root layout, avaliado no import do modulo. Tenta como esta;
// se falhar, tenta prefixar https://; em ultimo caso, undefined (Next so deixa de
// resolver URLs relativas de og:image — sem crash).
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
  title: "L. Augusto Atacado",
  description: "Jeans direto da fábrica do Agreste — atacado para lojas de todo o Brasil",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const me = await getCurrentUser();
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <SiteHeader me={me ? { email: me.email, role: me.role, name: me.name } : null} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
