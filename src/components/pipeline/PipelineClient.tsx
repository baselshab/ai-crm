"use client";

import React, { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sparkles,
  GripVertical,
  Building2,
  TrendingUp,
  Layers,
  Target,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Spinner, Avatar, Badge, Card } from "@/components/ui";
import {
  getPipelineDeals,
  updatePipelineStage,
  reorderPipeline,
  type PipelineDealItem,
} from "@/lib/actions/deals";
import { getLeadAiSummary } from "@/lib/actions/ai";
import { currency } from "@/lib/format";
import {
  PIPELINE_STAGES,
  STAGE_STYLES,
  PRIORITY_STYLES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

type BoardState = Record<string, PipelineDealItem[]>;

/* Group a flat deal list into { stage: PipelineDealItem[] } buckets. */
const toBoard = (items: PipelineDealItem[]): BoardState => {
  const board = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, [] as PipelineDealItem[]]));
  for (const item of items) {
    const stage = item.status in board ? item.status : "New";
    board[stage].push(item);
  }
  return board;
};

export interface PipelineClientProps {
  initialDeals?: PipelineDealItem[];
}

export function PipelineClient({ initialDeals }: PipelineClientProps) {
  const { tr, isRTL } = useTranslation();
  const [board, setBoard] = useState<BoardState | null>(
    initialDeals ? toBoard(initialDeals) : null
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    if (!initialDeals) {
      getPipelineDeals()
        .then((res) => setBoard(toBoard(res.deals)))
        .catch(() => setBoard(toBoard([])));
    }
  }, [initialDeals]);

  if (!board) return <Spinner />;

  const findContainer = (id: string) => {
    if (id in board) return id;
    return PIPELINE_STAGES.find((s) => board[s]?.some((l) => l._id === id));
  };

  const activeDeal = activeId
    ? Object.values(board).flat().find((l) => l._id === activeId)
    : null;

  /* Move cards between columns live as the user drags over them. */
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findContainer(String(active.id));
    const to = findContainer(String(over.id));
    if (!from || !to || from === to) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const fromItems = [...(prev[from] || [])];
      const toItems = [...(prev[to] || [])];
      const idx = fromItems.findIndex((l) => l._id === active.id);
      if (idx === -1) return prev;
      const [moved] = fromItems.splice(idx, 1);
      const updatedMoved = { ...moved, status: to as PipelineDealItem["status"], stage: to as PipelineDealItem["stage"] };

      // Insert near the hovered card (or append if hovering the column).
      const overIdx = toItems.findIndex((l) => l._id === over.id);
      toItems.splice(overIdx === -1 ? toItems.length : overIdx, 0, updatedMoved);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  /* Persist the final ordering + stage to the backend. */
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const container = findContainer(String(over.id));
    if (!container) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const items = [...(prev[container] || [])];
      const oldIdx = items.findIndex((l) => l._id === active.id);
      const newIdx = items.findIndex((l) => l._id === over.id);
      const reordered =
        oldIdx !== -1 && newIdx !== -1 ? arrayMove(items, oldIdx, newIdx) : items;
      const next = { ...prev, [container]: reordered };

      // Build the persistence payload across all affected columns.
      const updates: { id: string; status: string; order: number }[] = [];
      PIPELINE_STAGES.forEach((stage) => {
        next[stage]?.forEach((l, order) =>
          updates.push({ id: l._id, status: stage, order })
        );
      });

      // Persist stage and reorder to server
      reorderPipeline(updates).catch(() => toast.error("Could not save pipeline"));
      return next;
    });
  };

  /* ── KPI computations ─────────────────────────────────────────────── */
  const allDeals = Object.values(board).flat();
  const totalValue = allDeals.reduce((s, l) => s + (l.value || 0), 0);
  const openDeals = allDeals.filter((l) => l.status !== "Won" && l.status !== "Lost");
  const wonDeals = allDeals.filter((l) => l.status === "Won");
  const wonValue = wonDeals.reduce((s, l) => s + (l.value || 0), 0);
  const closedCount = wonDeals.length + (board.Lost?.length || 0);
  const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr.pipeline.title}
        subtitle={`${allDeals.length} ${tr.pipeline.openDeals} · ${currency(totalValue, { compact: true })}`}
      />

      {/* KPI summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={DollarSign}
          tint="bg-brand-50 text-brand-600"
          label={tr.pipeline.totalPipeline}
          value={currency(totalValue, { compact: true })}
        />
        <StatTile
          icon={Layers}
          tint="bg-sky-50 text-sky-600"
          label={tr.pipeline.openDeals}
          value={openDeals.length}
        />
        <StatTile
          icon={Target}
          tint="bg-emerald-50 text-emerald-600"
          label={tr.pipeline.wonValue}
          value={currency(wonValue, { compact: true })}
        />
        <StatTile
          icon={TrendingUp}
          tint="bg-violet-50 text-violet-600"
          label={tr.pipeline.winRate}
          value={`${winRate}%`}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }: DragStartEvent) => setActiveId(String(active.id))}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {PIPELINE_STAGES.map((stage) => (
            <Column key={stage} stage={stage} leads={board[stage] || []} />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard lead={activeDeal} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* ── KPI stat tile (matches reference pattern) ─────────────────────── */
function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-soft">{label}</p>
          <p className="font-display text-lg font-bold text-ink">{value}</p>
        </div>
      </div>
    </Card>
  );
}

/* ── Column ─────────────────────────────────────────────────────────── */
function Column({ stage, leads }: { stage: string; leads: PipelineDealItem[] }) {
  const { tr } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const style = STAGE_STYLES[stage] || STAGE_STYLES.New;
  const value = leads.reduce((s, l) => s + (l.value || 0), 0);

  return (
    <div className="flex w-80 shrink-0 flex-col">
      {/* Colored top accent bar */}
      <div className={cn("mb-2 h-1 w-full rounded-full", style.bar)} />

      {/* Column header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
          <h3 className="text-sm font-semibold text-ink">
            {tr.stages[stage as keyof typeof tr.stages] || stage}
          </h3>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-soft shadow-sm border border-line">
            {leads.length}
          </span>
        </div>
        <span className="text-xs font-medium text-ink-soft">
          {currency(value, { compact: true })}
        </span>
      </div>

      {/* Droppable column body */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[60vh] flex-1 flex-col gap-3 rounded-3xl border-2 border-dashed border-transparent bg-surface-muted/60 p-3 transition",
          isOver && "border-brand-300 bg-brand-50/60"
        )}
      >
        <SortableContext
          items={leads.map((l) => l._id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableCard key={lead._id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <p className="mt-6 text-center text-xs text-ink-soft">{tr.pipeline.emptyStage}</p>
        )}
      </div>
    </div>
  );
}

/* ── Sortable card wrapper ──────────────────────────────────────────── */
function SortableCard({ lead }: { lead: PipelineDealItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
    >
      <DealCard lead={lead} dragHandle={{ attributes, listeners }} />
    </div>
  );
}

/* ── Card UI ────────────────────────────────────────────────────────── */
function DealCard({
  lead,
  dragHandle,
  overlay,
}: {
  lead: PipelineDealItem;
  dragHandle?: { attributes: any; listeners: any };
  overlay?: boolean;
}) {
  const { tr } = useTranslation();
  const [suggesting, setSuggesting] = useState(false);

  const suggest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSuggesting(true);
    try {
      const res = await getLeadAiSummary(lead._id);
      toast(`AI suggestion for ${lead.name}`, {
        description: `${res.nextBestAction} (${tr.leads.suggestedPriority}: ${tr.priorities[res.suggestedPriority as keyof typeof tr.priorities] || res.suggestedPriority})`,
        duration: 7000,
      });
    } catch {
      toast.error("AI insight unavailable");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div
      className={cn(
        "group rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-soft)] transition border border-line/60 select-none",
        overlay ? "shadow-[var(--shadow-pop)] rotate-2" : "hover:shadow-[var(--shadow-card)]"
      )}
    >
      {/* Name / company row + drag handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={lead.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{lead.name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
              <Building2 className="h-3 w-3 shrink-0" />
              {lead.company || "—"}
            </p>
          </div>
        </div>
        {dragHandle && (
          <button
            {...dragHandle.attributes}
            {...dragHandle.listeners}
            className="cursor-grab text-ink-soft/50 transition hover:text-ink-soft active:cursor-grabbing p-1 rounded hover:bg-surface-muted"
            aria-label="Drag"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Value + priority */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-ink">{currency(lead.value)}</span>
        <Badge className={PRIORITY_STYLES[lead.priority]}>
          {tr.priorities[lead.priority as keyof typeof tr.priorities] || lead.priority}
        </Badge>
      </div>

      {/* AI suggest button — appears on hover, hidden in DragOverlay */}
      {!overlay && (
        <button
          onClick={suggest}
          disabled={suggesting}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-1.5 text-xs font-medium text-brand-700 opacity-0 transition group-hover:opacity-100 hover:bg-brand-100 disabled:opacity-60 cursor-pointer"
        >
          <Sparkles className={cn("h-3.5 w-3.5", suggesting && "animate-pulse")} />
          {suggesting ? "Thinking…" : tr.pipeline.aiNextStep}
        </button>
      )}
    </div>
  );
}
