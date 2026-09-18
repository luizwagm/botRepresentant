"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "ADMIN" | "VENDEDOR";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrador", VENDEDOR: "Vendedor" };

function formatDate(s: string | null): string {
  if (!s) return "nunca";
  return new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; user: User }
  | null;

export default function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function toggleActive(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    await load();
  }

  async function remove(u: User) {
    if (!confirm(`Excluir o usuário ${u.email}? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Falha ao excluir.");
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setModal({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <span className="text-base leading-none">+</span> Novo usuário
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Último acesso</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Carregando...</td></tr>
            )}
            {!loading && users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{u.name ?? "—"} {isSelf && <span className="text-xs text-indigo-600">(você)</span>}</div>
                    <div className="text-xs text-zinc-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${u.role === "ADMIN" ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-zinc-100 text-zinc-700 ring-zinc-200"}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">ativo</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200">inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModal({ mode: "edit", user: u })} className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium hover:bg-zinc-200">Editar</button>
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={isSelf}
                        className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium hover:bg-zinc-200 disabled:opacity-40"
                        title={isSelf ? "Não dá pra desativar a si mesmo" : ""}
                      >
                        {u.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => remove(u)}
                        disabled={isSelf}
                        className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                        title={isSelf ? "Não dá pra excluir a si mesmo" : ""}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <UserModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function UserModal({
  state,
  onClose,
  onSaved,
}: {
  state: { mode: "create" } | { mode: "edit"; user: User };
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = state.mode === "edit";
  const [email] = useState(editing ? state.user.email : "");
  const [name, setName] = useState(editing ? state.user.name ?? "" : "");
  const [role, setRole] = useState<Role>(editing ? state.user.role : "VENDEDOR");
  const [emailNew, setEmailNew] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let res: Response;
      if (editing) {
        const body: Record<string, unknown> = { name, role };
        if (password) body.password = password;
        res = await fetch(`/api/users/${state.user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailNew, name, role, password }),
        });
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha ao salvar.");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">{editing ? "Editar usuário" : "Novo usuário"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar">✕</button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Email</label>
            {editing ? (
              <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">{email}</div>
            ) : (
              <input
                type="email"
                value={emailNew}
                onChange={(e) => setEmailNew(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="vendedor@empresa.com"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Nome da pessoa"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="VENDEDOR">Vendedor (usa leads, funil e catálogo)</option>
              <option value="ADMIN">Administrador (acesso total + usuários e auditoria)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              {editing ? "Nova senha (deixe em branco pra manter)" : "Senha"}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder={editing ? "••••••" : "mínimo 6 caracteres"}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : editing ? "Salvar" : "Criar usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}
