"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONVERSATION_STATUSES,
  CONVERSATION_STATUS_COLOR,
  CONVERSATION_STATUS_LABEL,
  type ConversationStatusValue,
} from "@/lib/outreach/labels";
import {
  BR_STATES,
  FUNNEL_STAGES,
  FUNNEL_STAGE_LABEL,
  STORE_TYPES,
  STORE_TYPE_LABEL,
} from "@/lib/labels";
import { BR_CITIES } from "@/lib/br-cities";

type Aba = "conversas" | "agendar" | "conexao" | "config";

type ChannelState = "DESCONECTADO" | "AGUARDANDO_QR" | "CONECTADO";

type ChannelInfo = {
  state: ChannelState;
  workerOnline: boolean;
  connectedPhone: string | null;
  connectedAt: string | null;
  lastError: string | null;
  heartbeatAt: string | null;
  qrSvg: string | null;
};

type Diagnostico = {
  impedimentos: string[];
  pronto: boolean;
  automacaoLigada: boolean;
  workerOnline: boolean;
  whatsappConectado: boolean;
  dentroDaJanela: boolean;
  janela: { inicio: number; fim: number; fimDeSemana: boolean; fuso: string };
  enviadosHoje: number;
  tetoDiario: number;
  naFila: number;
  atrasadas: number;
  proximaTarefa: string | null;
  followUpsVencidos: number;
};

type Elegivel = {
  id: string;
  name: string;
  city: string;
  state: string;
  whatsapp: string | null;
  storeType: string;
  businessKind: string;
  funnelStage: string;
  rating: number | null;
  conversaStatus: string | null;
  agendadoPara: string | null;
  bloqueio: string | null;
};

type Conversation = {
  id: string;
  status: ConversationStatusValue;
  aiEnabled: boolean;
  followUpStage: number;
  nextActionAt: string | null;
  lastInboundAt: string | null;
  lead: { id: string; name: string; city: string; state: string; whatsapp: string | null };
  owner: string | null;
  messageCount: number;
  lastMessage: { body: string; direction: "ENTRADA" | "SAIDA" } | null;
};

type Message = {
  id: string;
  direction: "ENTRADA" | "SAIDA";
  body: string;
  viaAi: boolean;
  createdAt: string;
  /** Número que o WhatsApp confirmou como destino real do envio. */
  deliveredTo?: string | null;
};

type ConversationDetail = Conversation & { messages: Message[] };

type Settings = {
  enabled: boolean;
  tone: string;
  scriptGuidance: string;
  dailyCap: number;
  minGapSeconds: number;
  maxGapSeconds: number;
  windowStartHour: number;
  windowEndHour: number;
  sendOnWeekends: boolean;
};

type Batch = {
  id: string;
  scheduledFor: string;
  note: string | null;
  createdBy: string | null;
  total: number;
  counts: { PENDENTE: number; ENVIADO: number; FALHOU: number; CANCELADO: number };
};

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ProspeccaoAdmin() {
  const [aba, setAba] = useState<Aba>("conversas");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [canal, setCanal] = useState<ChannelInfo | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/outreach/settings");
      if (res.ok) setSettings((await res.json()) as Settings);
    } catch {
      /* silencioso */
    }
  }, []);

  // Estado do canal em background: alimenta o aviso do topo e a aba Conexão.
  const loadCanal = useCallback(async () => {
    try {
      const res = await fetch("/api/outreach/channel");
      if (res.ok) setCanal((await res.json()) as ChannelInfo);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadSettings();
      await loadCanal();
    })();
  }, [loadSettings, loadCanal]);

  async function toggleAutomacao(enabled: boolean): Promise<void> {
    const res = await fetch("/api/outreach/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) setSettings((await res.json()) as Settings);
  }

  return (
    <div className="space-y-6">
      {/* Chave geral */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-sm ${
          settings?.enabled ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"
        }`}
      >
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Automação {settings?.enabled ? "LIGADA" : "desligada"}
          </div>
          <p className="mt-0.5 text-xs text-zinc-600">
            {settings?.enabled
              ? "O sistema está enviando e respondendo sozinho, dentro das travas configuradas."
              : "Nada é enviado enquanto estiver desligada. Os agendamentos ficam esperando."}
          </p>
        </div>
        <button
          onClick={() => toggleAutomacao(!settings?.enabled)}
          disabled={!settings}
          className={`rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
            settings?.enabled ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {settings?.enabled ? "Desligar tudo" : "Ligar automação"}
        </button>
      </div>

      {/* Aviso de canal: automação ligada sem WhatsApp conectado não envia nada */}
      {canal && canal.state !== "CONECTADO" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-900">
            <strong>WhatsApp não conectado.</strong>{" "}
            {canal.workerOnline
              ? "Leia o QR code para conectar — nada é enviado sem isso."
              : "O worker de prospecção parece estar fora do ar."}
          </div>
          <button
            onClick={() => setAba("conexao")}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Abrir conexão
          </button>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b border-zinc-200">
        {(
          [
            ["conversas", "Conversas"],
            ["agendar", "Agendar contatos"],
            ["conexao", "Conexão"],
            ["config", "Vendedor de IA"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              aba === k
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "conversas" && <Conversas />}
      {aba === "agendar" && <Agendar onLigar={() => toggleAutomacao(true)} janela={settings} />}
      {aba === "conexao" && <Conexao info={canal} onRefresh={loadCanal} />}
      {aba === "config" && settings && <Config settings={settings} onSaved={setSettings} />}
    </div>
  );
}

// ==========================================================================
//  Conversas
// ==========================================================================
function Conversas() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [filtro, setFiltro] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<ConversationDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filtro ? `?status=${filtro}` : "";
      const res = await fetch(`/api/outreach/conversations${qs}`);
      const json = await res.json();
      if (res.ok) setItems(json.items);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function abrir(id: string) {
    const res = await fetch(`/api/outreach/conversations/${id}`);
    if (res.ok) setAberta((await res.json()) as ConversationDetail);
  }

  async function acao(id: string, action: "assumir" | "ligar_ia" | "desligar_ia") {
    await fetch(`/api/outreach/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    await abrir(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          {CONVERSATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONVERSATION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          onClick={() => void load()}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Atualizar
        </button>
        <span className="text-xs text-zinc-500">{loading ? "Carregando..." : `${items.length} conversa(s)`}</span>
      </div>

      {items.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
          Nenhuma conversa ainda. Agende contatos na aba ao lado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Última mensagem</th>
                <th className="px-4 py-3">IA</th>
                <th className="px-4 py-3">Próxima ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((c) => (
                <tr key={c.id} onClick={() => void abrir(c.id)} className="cursor-pointer hover:bg-indigo-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{c.lead.name}</div>
                    <div className="text-xs text-zinc-500">
                      {c.lead.city}/{c.lead.state} · {c.messageCount} msg
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CONVERSATION_STATUS_COLOR[c.status]}`}
                    >
                      {CONVERSATION_STATUS_LABEL[c.status]}
                    </span>
                    {c.owner && <div className="mt-1 text-[11px] text-zinc-500">{c.owner}</div>}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    {c.lastMessage ? (
                      <div className="truncate text-xs text-zinc-600">
                        <span className={c.lastMessage.direction === "ENTRADA" ? "text-amber-700" : "text-zinc-400"}>
                          {c.lastMessage.direction === "ENTRADA" ? "loja: " : "nós: "}
                        </span>
                        {c.lastMessage.body}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${c.aiEnabled ? "text-emerald-700" : "text-zinc-400"}`}>
                      {c.aiEnabled ? "ligada" : "desligada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{fmt(c.nextActionAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aberta && <ConversaModal conv={aberta} onClose={() => setAberta(null)} onAcao={acao} />}
    </div>
  );
}

function ConversaModal({
  conv,
  onClose,
  onAcao,
}: {
  conv: ConversationDetail;
  onClose: () => void;
  onAcao: (id: string, a: "assumir" | "ligar_ia" | "desligar_ia") => Promise<void>;
}) {
  const wa = conv.lead.whatsapp;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{conv.lead.name}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {conv.lead.city}/{conv.lead.state} ·{" "}
              <span className={`font-medium ${conv.aiEnabled ? "text-emerald-700" : "text-zinc-500"}`}>
                IA {conv.aiEnabled ? "ligada" : "desligada"}
              </span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 px-6 py-4">
          {conv.messages.length === 0 && <p className="text-sm text-zinc-500">Nenhuma mensagem ainda.</p>}
          {conv.messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === "SAIDA" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.direction === "SAIDA" ? "bg-emerald-600 text-white" : "bg-white text-zinc-800 ring-1 ring-zinc-200"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`mt-1 text-[10px] ${m.direction === "SAIDA" ? "text-emerald-100" : "text-zinc-400"}`}>
                  {fmt(m.createdAt)}
                  {m.direction === "SAIDA" && (m.viaAi ? " · IA" : " · você")}
                  {/* Confirma pra QUAL número o WhatsApp entregou. Sem isso não
                      dá pra saber se a mensagem foi pro número certo. */}
                  {m.direction === "SAIDA" &&
                    (m.deliveredTo ? ` · entregue a ${m.deliveredTo}` : " · destino não confirmado")}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-zinc-200 px-6 py-4">
          <p className="text-xs text-zinc-500">
            Para responder, escreva pelo WhatsApp do celular — o sistema registra sua mensagem e desliga a IA
            desta conversa automaticamente.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Abrir no WhatsApp
              </a>
            )}
            {conv.aiEnabled ? (
              <>
                <button
                  onClick={() => void onAcao(conv.id, "desligar_ia")}
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  Desligar IA
                </button>
                <button
                  onClick={() => void onAcao(conv.id, "assumir")}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Assumir conversa
                </button>
              </>
            ) : (
              <button
                onClick={() => void onAcao(conv.id, "ligar_ia")}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Religar IA
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
//  Conexão do WhatsApp (QR no painel)
// ==========================================================================
function Conexao({ info, onRefresh }: { info: ChannelInfo | null; onRefresh: () => Promise<void> }) {
  const [desconectando, setDesconectando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // O QR do WhatsApp expira em ~20s e o worker gera outro. Sem repetir a
  // busca, a tela mostraria um código morto que nunca conecta.
  useEffect(() => {
    const t = setInterval(() => void onRefresh(), 4_000);
    return () => clearInterval(t);
  }, [onRefresh]);

  async function desconectar() {
    if (!confirm("Desconectar este número? Você precisará ler um QR code novo para reconectar.")) {
      return;
    }
    setDesconectando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/outreach/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "desconectar" }),
      });
      const j = await res.json();
      setMsg(res.ok ? (j.aviso ?? "Pedido enviado.") : (j.error ?? "Falha."));
    } catch {
      setMsg("Falha ao pedir desconexão.");
    } finally {
      setDesconectando(false);
    }
  }

  if (!info) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
        Carregando estado da conexão...
      </div>
    );
  }

  const conectado = info.state === "CONECTADO";

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border p-5 shadow-sm ${
          conectado ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  conectado ? "bg-emerald-500" : info.workerOnline ? "bg-amber-500" : "bg-zinc-400"
                }`}
                aria-hidden
              />
              <span className="text-sm font-semibold text-zinc-900">
                {conectado
                  ? "WhatsApp conectado"
                  : info.state === "AGUARDANDO_QR"
                    ? "Aguardando leitura do QR"
                    : "Desconectado"}
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-zinc-600">
              {conectado && info.connectedPhone && <div>Número: {info.connectedPhone}</div>}
              {conectado && info.connectedAt && <div>Conectado desde {fmt(info.connectedAt)}</div>}
              <div className={info.workerOnline ? "text-zinc-500" : "font-medium text-red-700"}>
                Worker: {info.workerOnline ? "no ar" : "FORA DO AR"}
                {info.heartbeatAt && ` · último sinal ${fmt(info.heartbeatAt)}`}
              </div>
              {info.lastError && <div className="text-amber-700">{info.lastError}</div>}
            </div>
          </div>
          {conectado && (
            <button
              onClick={() => void desconectar()}
              disabled={desconectando}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {desconectando ? "Pedindo..." : "Desconectar / trocar número"}
            </button>
          )}
        </div>
        {msg && <div className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700">{msg}</div>}
      </div>

      {!info.workerOnline && !conectado && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <strong>O worker não está rodando.</strong> Sem ele o sistema não envia nem recebe nada.
          No servidor, rode:
          <code className="mt-2 block rounded bg-white/70 px-3 py-2 font-mono text-xs">
            pm2 start ecosystem.config.cjs &amp;&amp; pm2 save
          </code>
        </div>
      )}

      {info.qrSvg && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900">Conecte o número secundário</h3>
          <ol className="mx-auto mt-2 max-w-md list-decimal space-y-0.5 text-left text-sm text-zinc-600">
            <li>Abra o WhatsApp no celular do número que fará a prospecção.</li>
            <li>
              Toque em <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong>.
            </li>
            <li>Aponte a câmera para o código abaixo.</li>
          </ol>
          <div
            className="mx-auto mt-4 w-fit rounded-lg bg-white p-2 ring-1 ring-zinc-200 [&>svg]:h-64 [&>svg]:w-64"
            // O SVG vem do gerador de QR do próprio servidor (não é conteúdo de usuário).
            dangerouslySetInnerHTML={{ __html: info.qrSvg }}
          />
          <p className="mt-3 text-xs text-zinc-500">
            O código muda a cada poucos segundos — a tela atualiza sozinha.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
        <strong>Use um número secundário.</strong> Este canal não é oficial: existe risco real de
        banimento, sobretudo em disparo frio. Comece com poucos envios por dia e vá subindo devagar.
      </div>
    </div>
  );
}

// ==========================================================================
//  Diagnóstico: por que a fila não anda
// ==========================================================================
const MOTIVO_LABEL: Record<string, string> = {
  automacao_desligada: "A automação está DESLIGADA (chave geral no topo desta página).",
  worker_offline: "O worker de prospecção está fora do ar no servidor.",
  whatsapp_desconectado: "O WhatsApp não está conectado — leia o QR na aba Conexão.",
  endereco_publico_invalido:
    "PUBLIC_BASE_URL não configurada no servidor: os links do catálogo sairiam como localhost. Defina PUBLIC_BASE_URL=https://atacado.luizaugust.me no .env e reinicie.",
  fora_da_janela: "Fora do horário de envio configurado.",
  teto_diario: "O teto diário de mensagens já foi atingido.",
};

function DiagnosticoFila({ onLigar }: { onLigar?: () => Promise<void> }) {
  const [d, setD] = useState<Diagnostico | null>(null);
  const [ligando, setLigando] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/outreach/diagnostico");
      if (res.ok) setD((await res.json()) as Diagnostico);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [load]);

  if (!d) return null;

  const parado = d.atrasadas > 0 || d.followUpsVencidos > 0;

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        d.pronto
          ? "border-emerald-200 bg-emerald-50"
          : parado
            ? "border-red-200 bg-red-50"
            : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            {d.pronto
              ? "Motor pronto para enviar"
              : parado
                ? "A fila está parada"
                : "Motor com envio suspenso"}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {d.naFila} na fila
            {d.atrasadas > 0 && (
              <span className="font-semibold text-red-700"> · {d.atrasadas} com horário vencido</span>
            )}
            {d.followUpsVencidos > 0 && ` · ${d.followUpsVencidos} follow-up(s) vencido(s)`}
            {d.proximaTarefa && ` · próxima: ${fmt(d.proximaTarefa)}`}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            Enviadas hoje: {d.enviadosHoje}/{d.tetoDiario} · Janela {d.janela.inicio}h–{d.janela.fim}h
            {d.janela.fimDeSemana ? " (inclui fim de semana)" : " (dias úteis)"}
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
        >
          Atualizar
        </button>
      </div>

      {d.impedimentos.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-zinc-200/70 pt-3">
          {d.impedimentos.map((m) => (
            <li key={m} className="flex flex-wrap items-center gap-2 text-sm text-zinc-800">
              <span aria-hidden>&#9888;</span>
              <span>{MOTIVO_LABEL[m] ?? m}</span>
              {m === "automacao_desligada" && onLigar && (
                <button
                  onClick={async () => {
                    setLigando(true);
                    await onLigar();
                    await load();
                    setLigando(false);
                  }}
                  disabled={ligando}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {ligando ? "Ligando..." : "Ligar agora"}
                </button>
              )}
            </li>
          ))}
          {d.atrasadas > 0 && (
            <li className="pt-1 text-xs text-zinc-600">
              Assim que a trava for liberada, {d.atrasadas} contato(s) com horário vencido
              dispara(m) no próximo ciclo — nada expira por atraso.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ==========================================================================
//  Agendar
// ==========================================================================
function Agendar({
  onLigar,
  janela,
}: {
  onLigar?: () => Promise<void>;
  janela?: Pick<Settings, "windowStartHour" | "windowEndHour" | "sendOnWeekends"> | null;
}) {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState("");
  const [tipo, setTipo] = useState("");
  const [leads, setLeads] = useState<Elegivel[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [quando, setQuando] = useState("");
  const [nota, setNota] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);

  const cidades = useMemo(() => (state ? BR_CITIES.filter((c) => c.state === state) : []), [state]);

  const loadBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/outreach/schedule");
      const json = await res.json();
      if (res.ok) setBatches(json.items);
    } catch {
      /* silencioso */
    }
  }, []);

  // Busca nas lojas JÁ CAPTADAS. Sem filtro fixo de etapa: antes só apareciam
  // leads em "Novo lead", então a maior parte do que o usuário já tinha
  // buscado ficava invisível aqui.
  const buscarLeads = useCallback(async () => {
    setBuscando(true);
    setErro(null);
    try {
      const p = new URLSearchParams({ limit: "300" });
      if (state) p.set("state", state);
      if (city) p.set("city", city);
      if (q.trim()) p.set("q", q.trim());
      if (etapa) p.set("funnel_stage", etapa);
      if (tipo) p.set("store_type", tipo);
      const res = await fetch(`/api/outreach/elegiveis?${p.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha na busca.");
      setLeads(json.items as Elegivel[]);
      setSel(new Set());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na busca.");
    } finally {
      setBuscando(false);
    }
  }, [state, city, q, etapa, tipo]);

  // Carrega já na abertura: a tela abre mostrando as lojas que você tem.
  useEffect(() => {
    void (async () => {
      await loadBatches();
      await buscarLeads();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disponiveis = useMemo(() => leads.filter((l) => !l.bloqueio), [leads]);

  // Horário fora da janela de envio não dispara na hora marcada — ele espera a
  // janela abrir. Avisar aqui evita a surpresa de "agendei 8h e não saiu".
  const avisoJanela = useMemo(() => {
    if (!quando || !janela) return null;
    const d = new Date(quando);
    if (Number.isNaN(d.getTime())) return null;
    const h = d.getHours();
    const fds = d.getDay() === 0 || d.getDay() === 6;
    if (fds && !janela.sendOnWeekends) {
      return "Fim de semana está fora do envio configurado — vai sair no próximo dia útil.";
    }
    if (h < janela.windowStartHour) {
      return `Antes da janela de envio (${janela.windowStartHour}h–${janela.windowEndHour}h) — vai disparar às ${janela.windowStartHour}h.`;
    }
    if (h >= janela.windowEndHour) {
      return `Depois da janela de envio (${janela.windowStartHour}h–${janela.windowEndHour}h) — vai disparar no dia seguinte, às ${janela.windowStartHour}h.`;
    }
    return null;
  }, [quando, janela]);

  async function agendar() {
    if (sel.size === 0) {
      setErro("Selecione ao menos uma loja.");
      return;
    }
    if (!quando) {
      setErro("Escolha a data e a hora.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const res = await fetch("/api/outreach/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: [...sel],
          scheduledFor: new Date(quando).toISOString(),
          note: nota,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao agendar.");
      setMsg(`${json.created} contato(s) agendado(s).${json.skipped > 0 ? ` ${json.skipped} ignorado(s) (sem zap, opt-out ou já na fila).` : ""}`);
      setSel(new Set());
      await loadBatches();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao agendar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <DiagnosticoFila onLigar={onLigar} />

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold">1. Escolha as lojas</h2>
        <p className="mt-0.5 mb-3 text-xs text-zinc-500">
          Estas são as lojas que você já captou em <strong>Leads</strong>. Só aparecem as que têm
          WhatsApp e não pediram opt-out.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void buscarLeads();
            }}
            placeholder="Nome da loja..."
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm lg:col-span-2"
          />
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setCity("");
            }}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">UF (todas)</option>
            {BR_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!state}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:bg-zinc-50"
          >
            <option value="">{state ? "Cidade (todas)" : "Escolha a UF"}</option>
            {cidades.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Etapa (todas)</option>
            {FUNNEL_STAGES.map((s) => (
              <option key={s} value={s}>{FUNNEL_STAGE_LABEL[s]}</option>
            ))}
          </select>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tipo (todos)</option>
            {STORE_TYPES.map((t) => (
              <option key={t} value={t}>{STORE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void buscarLeads()}
            disabled={buscando}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {buscando ? "Buscando..." : "Buscar nas minhas lojas"}
          </button>
          {leads.length > 0 && (
            <>
              <button
                onClick={() => setSel(new Set(disponiveis.map((l) => l.id)))}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                Selecionar as {disponiveis.length} disponíveis
              </button>
              <button onClick={() => setSel(new Set())} className="text-xs font-medium text-zinc-500 hover:underline">
                Limpar
              </button>
            </>
          )}
          <span className="text-xs text-zinc-500">
            {buscando
              ? ""
              : `${leads.length} loja(s) · ${disponiveis.length} disponível(is) · ${sel.size} selecionada(s)`}
          </span>
        </div>

        {!buscando && leads.length === 0 && (
          <div className="mt-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma loja encontrada com esses filtros. Capte lojas em{" "}
            <strong>Leads → Buscar lojas</strong>.
          </div>
        )}

        {leads.length > 0 && (
          <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-zinc-200">
            {leads.map((l) => {
              const travado = l.bloqueio !== null;
              return (
                <label
                  key={l.id}
                  className={`flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-0 ${
                    travado ? "cursor-not-allowed bg-zinc-50/70" : "cursor-pointer hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={travado}
                    checked={sel.has(l.id)}
                    onChange={(e) => {
                      const next = new Set(sel);
                      if (e.target.checked) next.add(l.id);
                      else next.delete(l.id);
                      setSel(next);
                    }}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 disabled:opacity-40"
                  />
                  <span className={`font-medium ${travado ? "text-zinc-400" : "text-zinc-800"}`}>
                    {l.name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {l.city}/{l.state}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {l.bloqueio && (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {l.bloqueio}
                        {l.agendadoPara ? ` · ${fmt(l.agendadoPara)}` : ""}
                      </span>
                    )}
                    {!l.bloqueio && (
                      <span className="text-[10px] text-zinc-400">
                        {FUNNEL_STAGE_LABEL[l.funnelStage as keyof typeof FUNNEL_STAGE_LABEL] ?? l.funnelStage}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">2. Quando enviar</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Data e hora</label>
            <input
              type="datetime-local"
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            {avisoJanela && <p className="mt-1 text-xs text-amber-700">{avisoJanela}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Observação (opcional)</label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="ex.: lojas de Caruaru — lote da manhã"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {erro && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
        {msg && <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => void agendar()}
            disabled={salvando}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {salvando ? "Agendando..." : `Agendar ${sel.size} contato(s)`}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold">Agendamentos</h2>
        <p className="mb-3 mt-0.5 text-xs text-zinc-500">
          A fila é drenada <strong>do horário mais antigo para o mais novo</strong>, um contato por
          vez com intervalo variável. Se um lote atrasado ainda tem pendências, ele sai primeiro —
          inclusive antes de um lote mais novo que acabou de vencer.
        </p>
        {batches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            Nenhum agendamento ainda.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Observação</th>
                  <th className="px-4 py-3">Andamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-zinc-800">{fmt(b.scheduledFor)}</td>
                    <td className="px-4 py-3 text-zinc-600">{b.note ?? <span className="text-zinc-400">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {b.counts.ENVIADO}/{b.total} enviados
                      {b.counts.PENDENTE > 0 && ` · ${b.counts.PENDENTE} na fila`}
                      {b.counts.FALHOU > 0 && ` · ${b.counts.FALHOU} falharam`}
                      {b.counts.CANCELADO > 0 && ` · ${b.counts.CANCELADO} cancelados`}
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

// ==========================================================================
//  Configuração do vendedor de IA
// ==========================================================================
function Config({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useState<Settings>(settings);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function patch(p: Partial<Settings>) {
    setForm((f) => ({ ...f, ...p }));
    setMsg(null);
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/outreach/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao salvar.");
      onSaved(json as Settings);
      setForm(json as Settings);
      setMsg("Salvo.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold">Tom de voz</h2>
        <p className="mt-1 text-xs text-zinc-500">Como o vendedor fala. Não são mensagens prontas — a IA escreve cada uma olhando a conversa.</p>
        <textarea
          value={form.tone}
          onChange={(e) => patch({ tone: e.target.value })}
          rows={10}
          className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold">Ideia de roteiro</h2>
        <p className="mt-1 text-xs text-zinc-500">O que a conversa precisa cobrir e onde ela deve parar e chamar você.</p>
        <textarea
          value={form.scriptGuidance}
          onChange={(e) => patch({ scriptGuidance: e.target.value })}
          rows={12}
          className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs"
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-amber-900">Travas de envio</h2>
        <p className="mt-1 text-xs text-amber-800">
          Volume alto, horário ruim e ritmo robótico são o que mais queima número no WhatsApp. Comece devagar
          (10–20/dia) e vá subindo ao longo de semanas.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Máximo por dia">
            <input
              type="number"
              min={1}
              value={form.dailyCap}
              onChange={(e) => patch({ dailyCap: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Intervalo mínimo (seg)">
            <input
              type="number"
              min={5}
              value={form.minGapSeconds}
              onChange={(e) => patch({ minGapSeconds: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Intervalo máximo (seg)">
            <input
              type="number"
              min={5}
              value={form.maxGapSeconds}
              onChange={(e) => patch({ maxGapSeconds: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Enviar a partir das">
            <input
              type="number"
              min={0}
              max={23}
              value={form.windowStartHour}
              onChange={(e) => patch({ windowStartHour: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Enviar até as">
            <input
              type="number"
              min={1}
              max={24}
              value={form.windowEndHour}
              onChange={(e) => patch({ windowEndHour: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </Campo>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.sendOnWeekends}
                onChange={(e) => patch({ sendOnWeekends: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
              />
              Enviar em fim de semana
            </label>
          </div>
        </div>
      </div>

      {msg && <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">{msg}</div>}
      <div className="flex justify-end">
        <button
          onClick={() => void salvar()}
          disabled={salvando}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar configuração"}
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}
