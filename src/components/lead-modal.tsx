"use client";

import { useState } from "react";
import {
  FUNNEL_STAGES,
  FUNNEL_STAGE_LABEL,
  STORE_TYPES,
  STORE_TYPE_LABEL,
  type FunnelStageValue,
  type StoreTypeValue,
} from "@/lib/labels";

export type Lead = {
  id: string;
  placeId: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  storeType: StoreTypeValue;
  responsibleName: string | null;
  foundedAt: string | null;
  funnelStage: FunnelStageValue;
  notes: string | null;
  optOut: boolean;
  createdAt: string;
};

export default function LeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: (updated: Lead) => void;
}) {
  const [form, setForm] = useState({
    responsibleName: lead.responsibleName ?? "",
    foundedAt: lead.foundedAt ? lead.foundedAt.slice(0, 10) : "",
    notes: lead.notes ?? "",
    funnelStage: lead.funnelStage,
    storeType: lead.storeType,
    optOut: lead.optOut,
    instagram: lead.instagram ?? "",
    whatsapp: lead.whatsapp ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado da mensagem de primeiro contato
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Falha ao salvar.");
      setSaving(false);
      return;
    }
    const updated = (await res.json()) as Lead;
    onSaved(updated);
    setSaving(false);
  }

  async function generateMessage() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-message`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha");
      }
      const j = (await res.json()) as { message: string };
      setMessage(j.message);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Falha ao gerar");
    }
    setGenerating(false);
  }

  async function openWhatsApp() {
    if (!lead.whatsapp || !message.trim()) return;
    // Loga + avança o card pra MENSAGEM_ENVIADA antes de abrir o link
    const res = await fetch(`/api/leads/${lead.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "whatsapp", message, advanceStage: true }),
    });
    if (res.ok) {
      const j = (await res.json()) as { lead: Lead };
      onSaved(j.lead);
      setForm((f) => ({ ...f, funnelStage: j.lead.funnelStage }));
    }
    const url = `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const canSendWhatsApp = Boolean(lead.whatsapp && message.trim() && !lead.optOut);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{lead.name}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{lead.city}/{lead.state}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Fechar">✕</button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Info do Maps (read-only) */}
          <div className="rounded-lg bg-zinc-50 p-4 text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Info label="Endereço" value={lead.address} />
              <Info label="Telefone (Maps)" value={lead.phone} />
              <Info label="Site" value={lead.website} link />
              <Info label="Avaliação" value={lead.rating ? `${lead.rating}★ (${lead.reviewCount ?? 0})` : null} />
            </div>
          </div>

          {/* Bloco da mensagem de WhatsApp + IA */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">Primeiro contato (WhatsApp)</h3>
              <button
                onClick={generateMessage}
                disabled={generating || lead.optOut}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {generating ? "Gerando..." : message ? "Regerar com IA" : "Gerar com IA"}
              </button>
            </div>
            {genError && <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{genError}</div>}
            {!lead.whatsapp && (
              <div className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Esta loja não tem WhatsApp cadastrado. Preencha o campo abaixo pra liberar o envio.
              </div>
            )}
            {lead.optOut && (
              <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                Lead com opt-out — envio bloqueado (LGPD).
              </div>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              placeholder='Clique em "Gerar com IA" ou escreva manualmente...'
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {message.length} caracteres
              </span>
              <button
                onClick={openWhatsApp}
                disabled={!canSendWhatsApp}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Abrir no WhatsApp
              </button>
            </div>
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {/* Edicao dos campos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome do responsável">
              <input
                type="text"
                value={form.responsibleName}
                onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Quem você fala diretamente"
              />
            </Field>
            <Field label="Fundada em (ano ou data)">
              <input
                type="text"
                value={form.foundedAt}
                onChange={(e) => setForm({ ...form, foundedAt: e.target.value })}
                placeholder="ex.: 2015 ou 2015-03-10"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>
            <Field label="WhatsApp (E.164, ex: 5583999...)">
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Instagram (@)">
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Tipo de loja">
              <select
                value={form.storeType}
                onChange={(e) => setForm({ ...form, storeType: e.target.value as StoreTypeValue })}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {STORE_TYPES.map((t) => (
                  <option key={t} value={t}>{STORE_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Etapa do funil">
              <select
                value={form.funnelStage}
                onChange={(e) => setForm({ ...form, funnelStage: e.target.value as FunnelStageValue })}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {FUNNEL_STAGES.map((s) => (
                  <option key={s} value={s}>{FUNNEL_STAGE_LABEL[s]}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Anotações sobre essa loja..."
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.optOut}
              onChange={(e) => setForm({ ...form, optOut: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
            />
            Opt-out (não contatar mais)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-900">
        {value ? (
          link ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-zinc-400">—</span>
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
