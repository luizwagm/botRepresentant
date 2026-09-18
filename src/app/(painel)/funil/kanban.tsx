"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import LeadModal, { type Lead } from "@/components/lead-modal";
import {
  BUSINESS_KIND_COLOR,
  BUSINESS_KIND_LABEL,
  FUNNEL_STAGES,
  FUNNEL_STAGE_COLOR,
  FUNNEL_STAGE_LABEL,
  STORE_TYPE_LABEL,
  type FunnelStageValue,
} from "@/lib/labels";

// Colunas saem direto de FUNNEL_STAGES (labels.ts) — sem lista duplicada aqui,
// entao adicionar uma etapa la ja cria a coluna no Kanban.
const COLUMNS: readonly FunnelStageValue[] = FUNNEL_STAGES;

export default function Kanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);

  // Carregar todos (sem filtro de stage). Limite alto pra suportar varios milhares.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/leads?limit=200&page=1");
      const json = await res.json();
      if (!cancelled) {
        setLeads(json.items);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const targetStage = String(over.id) as FunnelStageValue;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.funnelStage === targetStage) return;

    // Optimistic update
    const prevStage = lead.funnelStage;
    setLeads((arr) =>
      arr.map((l) => (l.id === leadId ? { ...l, funnelStage: targetStage } : l)),
    );

    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funnelStage: targetStage }),
    });

    if (!res.ok) {
      // Rollback
      setLeads((arr) =>
        arr.map((l) => (l.id === leadId ? { ...l, funnelStage: prevStage } : l)),
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((stage) => {
              const items = leads.filter((l) => l.funnelStage === stage);
              return (
                <Column key={stage} stage={stage} count={items.length}>
                  {loading && items.length === 0 ? (
                    <div className="text-xs text-zinc-400 px-2 py-4">Carregando...</div>
                  ) : items.length === 0 ? (
                    <div className="text-xs text-zinc-400 italic px-2 py-4">Vazio</div>
                  ) : (
                    items.map((lead) => (
                      <Card
                        key={lead.id}
                        lead={lead}
                        onClick={() => setSelected(lead)}
                        isDragging={activeId === lead.id}
                      />
                    ))
                  )}
                </Column>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeLead ? <CardPreview lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>

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
    </>
  );
}

function Column({
  stage,
  count,
  children,
}: {
  stage: FunnelStageValue;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 rounded-lg bg-zinc-100/70 p-3 transition ${isOver ? "ring-2 ring-indigo-400 bg-indigo-50/60" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${FUNNEL_STAGE_COLOR[stage]}`}>
          {FUNNEL_STAGE_LABEL[stage]}
        </span>
        <span className="text-xs font-medium text-zinc-500">{count}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[100px]">{children}</div>
    </div>
  );
}

function Card({
  lead,
  onClick,
  isDragging,
}: {
  lead: Lead;
  onClick: () => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Evita confundir click com drag (PointerSensor ja exige 6px de movimento)
        if (!transform || (transform.x === 0 && transform.y === 0)) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`cursor-grab active:cursor-grabbing rounded-md bg-white border border-zinc-200 p-3 shadow-sm hover:shadow-md transition ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="font-medium text-sm text-zinc-900 leading-snug line-clamp-2">{lead.name}</div>
      <div className="mt-1 text-xs text-zinc-500">{lead.city}/{lead.state}</div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-zinc-600">{STORE_TYPE_LABEL[lead.storeType]}</span>
        {lead.rating && (
          <span className="text-zinc-500">
            {lead.rating}★ <span className="text-zinc-400">({lead.reviewCount ?? 0})</span>
          </span>
        )}
      </div>
      {lead.businessKind === "FABRICANTE" && (
        <span
          className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BUSINESS_KIND_COLOR.FABRICANTE}`}
        >
          {BUSINESS_KIND_LABEL.FABRICANTE}
        </span>
      )}
      {lead.whatsapp && (
        <div className="mt-1 text-xs text-emerald-700">WA pronto</div>
      )}
    </div>
  );
}

function CardPreview({ lead }: { lead: Lead }) {
  return (
    <div className="cursor-grabbing rounded-md bg-white border border-indigo-300 p-3 shadow-xl w-72 rotate-2">
      <div className="font-medium text-sm text-zinc-900">{lead.name}</div>
      <div className="mt-1 text-xs text-zinc-500">{lead.city}/{lead.state}</div>
    </div>
  );
}
