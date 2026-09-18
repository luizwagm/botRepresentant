"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LeadModal, { type Lead } from "@/components/lead-modal";
import {
  BR_STATES,
  BUSINESS_KINDS,
  BUSINESS_KIND_COLOR,
  BUSINESS_KIND_LABEL,
  FUNNEL_STAGES,
  FUNNEL_STAGE_COLOR,
  FUNNEL_STAGE_LABEL,
  STORE_TYPES,
  STORE_TYPE_LABEL,
} from "@/lib/labels";
import { BR_CITIES } from "@/lib/br-cities";

type Filters = {
  city: string;
  state: string;
  storeType: string;
  businessKind: string;
  funnelStage: string;
  hasWhatsapp: boolean;
  hasInstagram: boolean;
  q: string;
};

const EMPTY_FILTERS: Filters = {
  city: "",
  state: "",
  storeType: "",
  businessKind: "",
  funnelStage: "",
  hasWhatsapp: false,
  hasInstagram: false,
  q: "",
};

type HuntResult = {
  city: string;
  state: string;
  total: number;
  inserted: number;
  skipped: { blacklist: number; quality: number; noPlaceId: number; duplicate: number; alreadyListed: number };
};

export default function LeadsTable() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showHunt, setShowHunt] = useState(false);

  const citiesForFilterState = useMemo(
    () => (filters.state ? BR_CITIES.filter((c) => c.state === filters.state) : []),
    [filters.state],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.city) params.set("city", filters.city);
    if (filters.state) params.set("state", filters.state);
    if (filters.storeType) params.set("store_type", filters.storeType);
    if (filters.businessKind) params.set("business_kind", filters.businessKind);
    if (filters.funnelStage) params.set("funnel_stage", filters.funnelStage);
    if (filters.hasWhatsapp) params.set("has_whatsapp", "1");
    if (filters.hasInstagram) params.set("has_instagram", "1");
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(page));
    params.set("limit", "50");

    // Sem try/catch aqui, um erro da API (ou uma pagina de erro nao-JSON)
    // rejeitava a promise e o setLoading(false) nunca rodava — a tela ficava
    // presa em "Carregando..." ate o F5.
    try {
      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar leads.");
      setLeads(json.items);
      setPagination(json.pagination);
      setLoadError(null);
    } catch (e) {
      setLeads([]);
      setPagination({ total: 0, totalPages: 1 });
      setLoadError(e instanceof Error ? e.message : "Falha ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowHunt(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <span className="text-base leading-none">+</span> Buscar lojas
        </button>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar por nome ou endereço..."
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={filters.state}
            onChange={(e) => {
              setFilters((f) => ({ ...f, state: e.target.value, city: "" }));
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">UF (todas)</option>
            {BR_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filters.city}
            onChange={(e) => updateFilter("city", e.target.value)}
            disabled={!filters.state}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            <option value="">{filters.state ? "Cidade (todas)" : "Escolha a UF primeiro"}</option>
            {citiesForFilterState.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select
            value={filters.storeType}
            onChange={(e) => updateFilter("storeType", e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Tipo</option>
            {STORE_TYPES.map((t) => (
              <option key={t} value={t}>{STORE_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select
            value={filters.businessKind}
            onChange={(e) => updateFilter("businessKind", e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Fabricante/varejista</option>
            {BUSINESS_KINDS.map((k) => (
              <option key={k} value={k}>{BUSINESS_KIND_LABEL[k]}</option>
            ))}
          </select>
          <select
            value={filters.funnelStage}
            onChange={(e) => updateFilter("funnelStage", e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Etapa do funil</option>
            {FUNNEL_STAGES.map((s) => (
              <option key={s} value={s}>{FUNNEL_STAGE_LABEL[s]}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={filters.hasWhatsapp}
              onChange={(e) => updateFilter("hasWhatsapp", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            Com WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={filters.hasInstagram}
              onChange={(e) => updateFilter("hasInstagram", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            Com Instagram
          </label>
          <button
            onClick={clearFilters}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Limpar filtros
          </button>
        </div>
        {loadError && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</div>
        )}
        <div className="mt-3 text-xs text-zinc-500">
          {loading ? "Carregando..." : `${pagination.total.toLocaleString("pt-BR")} leads encontrados`}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Cidade/UF</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Avaliação</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {leads.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelected(lead)}
                className="cursor-pointer hover:bg-indigo-50/50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{lead.name}</div>
                  {lead.responsibleName && (
                    <div className="text-xs text-zinc-500">Resp.: {lead.responsibleName}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {lead.city}/{lead.state}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  <div>{STORE_TYPE_LABEL[lead.storeType]}</div>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BUSINESS_KIND_COLOR[lead.businessKind]}`}
                  >
                    {BUSINESS_KIND_LABEL[lead.businessKind]}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {lead.rating ? (
                    <span>
                      {lead.rating}★ <span className="text-zinc-400">({lead.reviewCount ?? 0})</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  <div className="flex flex-col gap-0.5 text-xs">
                    {lead.whatsapp && <span className="text-emerald-700">WA: {lead.whatsapp}</span>}
                    {lead.instagram && <span className="text-pink-700">IG: @{lead.instagram}</span>}
                    {!lead.whatsapp && !lead.instagram && <span className="text-zinc-400">sem contato direto</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${FUNNEL_STAGE_COLOR[lead.funnelStage]}`}
                  >
                    {FUNNEL_STAGE_LABEL[lead.funnelStage]}
                  </span>
                  {lead.optOut && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                      opt-out
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <div>Página {page} de {pagination.totalPages}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {selected && (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setLeads((arr) => arr.map((l) => (l.id === updated.id ? updated : l)));
            setSelected(updated);
          }}
        />
      )}

      {showHunt && <HuntModal onClose={() => setShowHunt(false)} onDone={() => load()} />}
    </div>
  );
}

function HuntModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HuntResult | null>(null);

  const citiesForState = useMemo(() => BR_CITIES.filter((c) => c.state === state), [state]);

  async function run() {
    if (!city.trim() || !state) {
      setError("Preencha cidade e estado.");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), state }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falha na busca.");
      setResult(j as HuntResult);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na busca.");
    }
    setRunning(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4"
      onClick={running ? undefined : onClose}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Buscar lojas</h2>
            <p className="mt-0.5 text-sm text-zinc-500">Varre o Google Maps e adiciona lojas novas ao banco.</p>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
            aria-label="Fechar"
          >✕</button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Estado (UF)</label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
              disabled={running}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50"
            >
              <option value="">Selecione a UF...</option>
              {BR_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Cidade <span className="font-normal text-zinc-400">(a partir de 20 mil habitantes)</span>
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={running || !state}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50"
            >
              <option value="">{state ? `Selecione a cidade (${citiesForState.length})...` : "Escolha a UF primeiro"}</option>
              {citiesForState.map((c) => (
                <option key={c.name} value={c.name}>{c.name} - {c.state}</option>
              ))}
            </select>
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {running && (
            <div className="rounded-md bg-indigo-50 px-3 py-3 text-sm text-indigo-700">
              Buscando no Google Maps... isso leva alguns segundos. Não feche esta janela.
            </div>
          )}

          {result && (
            <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="font-medium">Busca concluída em {result.city}/{result.state}</div>
              <ul className="mt-1.5 space-y-0.5 text-emerald-700">
                <li>✓ {result.inserted} lojas novas adicionadas</li>
                <li>↻ {result.skipped.alreadyListed} já cadastradas (ignoradas)</li>
                <li className="text-emerald-600/80">
                  {result.skipped.blacklist} atacado/fábrica e {result.skipped.quality} de baixa qualidade filtradas
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
          >
            {result ? "Fechar" : "Cancelar"}
          </button>
          <button
            onClick={run}
            disabled={running}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? "Buscando..." : result ? "Buscar outra" : "Buscar"}
          </button>
        </div>
      </div>
    </div>
  );
}
