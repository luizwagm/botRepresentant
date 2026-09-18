"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/brand-logo";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const pedido = sp.get("next") || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push(destinoSeguro(pedido));
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Falha no login.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6">
        <BrandLogo variant="full" size="md" tone="claro" />
        <p className="mt-4 text-sm text-zinc-500">Entre para acessar o painel.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-zinc-700">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          // 16px no celular: abaixo disso o Safari do iPhone dá zoom ao focar o campo.
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-[#9a6c4e] focus:outline-none focus:ring-1 focus:ring-[#9a6c4e] sm:text-sm"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-1 block text-xs font-medium text-zinc-700">Senha</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-[#9a6c4e] focus:outline-none focus:ring-1 focus:ring-[#9a6c4e] sm:text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

/**
 * Só destino DESTE site. Checar o texto ("começa com / e não com //") não basta:
 * "/\evil.com" e "/%09/evil.com" passam e o navegador resolve pra fora
 * (open redirect logo depois do login). Resolvendo a URL de verdade e
 * comparando a origem, qualquer variação cai no painel.
 */
function destinoSeguro(pedido: string): string {
  if (!pedido.startsWith("/")) return "/painel";
  try {
    const u = new URL(pedido, window.location.origin);
    if (u.origin !== window.location.origin) return "/painel";
    // "/.//evil.com" resolve na MESMA origem com caminho "//evil.com" — que, de
    // volta num push, seria lido como endereço externo.
    const caminho = `${u.pathname}${u.search}${u.hash}`;
    return caminho.startsWith("//") ? "/painel" : caminho;
  } catch {
    return "/painel";
  }
}
