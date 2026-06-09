"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

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
      router.push(next);
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
      className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
    >
      <div className="mb-6">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-semibold">
          JH
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Jeans Hunter</h1>
        <p className="mt-1 text-sm text-zinc-500">Entre para acessar o painel.</p>
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
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-1 block text-xs font-medium text-zinc-700">Senha</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
