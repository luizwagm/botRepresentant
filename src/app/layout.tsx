import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/logout-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jeans Hunter",
  description: "Prospecção B2B de lojas para revenda de jeans no atacado",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white text-sm">JH</span>
              <span>Jeans Hunter</span>
            </Link>
            {me && (
              <nav className="flex items-center gap-1 text-sm font-medium text-zinc-600">
                <Link href="/leads" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 hover:text-zinc-900">Leads</Link>
                <Link href="/funil" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 hover:text-zinc-900">Funil</Link>
                <Link href="/catalogo" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 hover:text-zinc-900">Catálogo</Link>
                {me.role === "ADMIN" && (
                  <>
                    <Link href="/usuarios" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 hover:text-zinc-900">Usuários</Link>
                    <Link href="/auditoria" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 hover:text-zinc-900">Auditoria</Link>
                  </>
                )}
                <span className="mx-2 h-4 w-px bg-zinc-200" />
                <span className="hidden text-zinc-400 sm:inline">{me.name ?? me.email}</span>
                <LogoutButton email={me.email} />
              </nav>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
