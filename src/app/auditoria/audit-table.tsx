"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  changes: unknown;
  ip: string | null;
  createdAt: string;
};

const ACTIONS = [
  "LOGIN",
  "LOGIN_FALHOU",
  "LOGOUT",
  "CRIAR",
  "ATUALIZAR",
  "EXCLUIR",
  "MENSAGEM",
  "BUSCA",
  "FUNIL",
];

const ENTITIES = ["Lead", "Product", "User", "Hunt"];

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Login",
  LOGIN_FALHOU: "Login falhou",
  LOGOUT: "Logout",
  CRIAR: "Criou",
  ATUALIZAR: "Atualizou",
  EXCLUIR: "Excluiu",
  MENSAGEM: "Mensagem",
  BUSCA: "Busca",
  FUNIL: "Funil",
};

const ACTION_COLOR: Record<string, string> = {
  LOGIN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LOGIN_FALHOU: "bg-red-50 text-red-700 ring-red-200",
  LOGOUT: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  CRIAR: "bg-blue-50 text-blue-700 ring-blue-200",
  ATUALIZAR: "bg-amber-50 text-amber-800 ring-amber-200",
  EXCLUIR: "bg-rose-50 text-rose-700 ring-rose-200",
  MENSAGEM: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  BUSCA: "bg-violet-50 text-violet-700 ring-violet-200",
  FUNIL: "bg-teal-50 text-teal-700 ring-teal-200",
};

function fmt(s: string): string {
  return new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function renderChanges(changes: unknown): string {
  if (changes === null || changes === undefined) return "";
  if (typeof changes !== "object") return String(changes);
  const obj = changes as Record<string, unknown>;
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === "object" && "from" in (val as object) && "to" in (val as object)) {
      const v = val as { from: unknown; to: unknown };
      lines.push(`${key}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(val)}`);
    }
  }
  return lines.join("\n");
}

export default function AuditTable() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (entityType) params.set("entity_type", entityType);
    if (actor) params.set("actor", actor);
    if (q) params.set("q", q);
    params.set("page", String(page));
    const res = await fetch(`/api/audit?${params.toString()}`);
    const json = await res.json();
    setItems(json.items);
    setPagination(json.pagination);
    setLoading(false);
  }, [action, entityType, actor, q, page]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function resetPageAnd<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar no resumo..."
            value={q}
            onChange={(e) => resetPageAnd(setQ)(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Ator (email)"
            value={actor}
            onChange={(e) => resetPageAnd(setActor)(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={action}
            onChange={(e) => resetPageAnd(setAction)(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Toda ação</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>
            ))}
          </select>
          <select
            value={entityType}
            onChange={(e) => resetPageAnd(setEntityType)(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Toda entidade</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          {loading ? "Carregando..." : `${pagination.total.toLocaleString("pt-BR")} registros`}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Data/hora</th>
              <th className="px-4 py-3">Ator</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Resumo</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nenhum registro.</td></tr>
            )}
            {items.map((e) => {
              const hasChanges = e.changes !== null && e.changes !== undefined;
              const isOpen = expanded === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    onClick={() => hasChanges && setExpanded(isOpen ? null : e.id)}
                    className={`${hasChanges ? "cursor-pointer hover:bg-zinc-50/60" : ""}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600">{fmt(e.createdAt)}</td>
                    <td className="px-4 py-3 text-zinc-700">{e.actorEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ACTION_COLOR[e.action] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200"}`}>
                        {ACTION_LABEL[e.action] ?? e.action}
                      </span>
                      {e.entityType && <span className="ml-1 text-xs text-zinc-400">{e.entityType}</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-800">
                      {e.summary}
                      {hasChanges && <span className="ml-2 text-xs text-indigo-500">{isOpen ? "▲" : "▼ detalhes"}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{e.ip ?? "—"}</td>
                  </tr>
                  {isOpen && hasChanges && (
                    <tr className="bg-zinc-50/80">
                      <td colSpan={5} className="px-4 py-3">
                        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-zinc-600">{renderChanges(e.changes)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <div>Página {pagination.page} de {pagination.totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50">Anterior</button>
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
