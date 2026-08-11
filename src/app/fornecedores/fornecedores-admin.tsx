"use client";

import { useCallback, useEffect, useState } from "react";
import { BR_STATES } from "@/lib/labels";

export type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  productLine: string | null;
  notes: string | null;
  active: boolean;
  _count?: { products: number };
};

type FormState = {
  id?: string;
  name: string;
  contactName: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  productLine: string;
  notes: string;
  active: boolean;
};

const EMPTY: FormState = {
  name: "",
  contactName: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  state: "",
  productLine: "",
  notes: "",
  active: true,
};

export default function FornecedoresAdmin() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (res.ok) setSuppliers(json.items);
    } catch {
      setError("Falha ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function startEdit(s: Supplier) {
    setForm({
      id: s.id,
      name: s.name,
      contactName: s.contactName ?? "",
      phone: s.phone ?? "",
      whatsapp: s.whatsapp ?? "",
      email: s.email ?? "",
      city: s.city ?? "",
      state: s.state ?? "",
      productLine: s.productLine ?? "",
      notes: s.notes ?? "",
      active: s.active,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(EMPTY);
    setError(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = form.id
        ? await fetch(`/api/suppliers/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          })
        : await fetch("/api/suppliers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Falha ao salvar.");
        return;
      }
      resetForm();
      await load();
    } catch {
      // Rejeicao de rede (offline, servidor reiniciando) — sem isto o botao
      // ficaria preso em "Salvando..." pra sempre.
      setError("Falha ao salvar. Verifique a conexão e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Supplier) {
    const n = s._count?.products ?? 0;
    const extra = n > 0 ? `\n\n${n} produto(s) ficarão SEM fornecedor (não serão apagados).` : "";
    if (!confirm(`Excluir o fornecedor "${s.name}"?${extra}`)) return;
    try {
      await fetch(`/api/suppliers/${s.id}`, { method: "DELETE" });
    } catch {
      setError("Falha ao excluir. Verifique a conexão.");
    }
    await load();
  }

  return (
    <div className="space-y-8">
      {/* Formulário */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{form.id ? "Editar fornecedor" : "Novo fornecedor"}</h2>
          {form.id && (
            <button onClick={resetForm} className="text-sm text-zinc-500 hover:text-zinc-900">+ Novo</button>
          )}
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome / Fábrica *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ex.: Confecção Silva"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
          <Field label="O que fornece">
            <input
              type="text"
              value={form.productLine}
              onChange={(e) => setForm({ ...form, productLine: e.target.value })}
              placeholder="ex.: jeans masculino"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Responsável (contato)">
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
          <Field label="WhatsApp">
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(81) 99999-9999"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Telefone">
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Cidade">
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="ex.: Toritama"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
          <Field label="UF">
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">—</option>
              {BR_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Prazo de produção, condições, capacidade..."
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            Fornecedor ativo
          </label>
          <div className="flex gap-2">
            <button onClick={resetForm} className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancelar</button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar fornecedor"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div>
        <h2 className="mb-3 text-base font-semibold">
          Fornecedores cadastrados {loading ? "" : `(${suppliers.length})`}
        </h2>
        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">Carregando...</div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
            Nenhum fornecedor cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Fornece</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Produtos</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{s.name}</div>
                      {s.contactName && <div className="text-xs text-zinc-500">{s.contactName}</div>}
                      {!s.active && <span className="mt-0.5 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">inativo</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{s.productLine ?? <span className="text-zinc-400">—</span>}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {s.city || s.state ? `${s.city ?? ""}${s.city && s.state ? "/" : ""}${s.state ?? ""}` : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {s.whatsapp && <div className="text-emerald-700">WA: {s.whatsapp}</div>}
                      {s.phone && <div>{s.phone}</div>}
                      {s.email && <div className="text-zinc-500">{s.email}</div>}
                      {!s.whatsapp && !s.phone && !s.email && <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{s._count?.products ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(s)} className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium hover:bg-zinc-200">Editar</button>
                        <button onClick={() => remove(s)} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}
