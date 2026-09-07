"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  StickyNote,
  Link2,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Button,
  Card,
  Badge,
  Dropdown,
  DropdownItem,
  Spinner,
} from "@/components/ui";
import { NoteFormDialog } from "@/components/notes/NoteFormDialog";
import {
  getNotes,
  updateNote,
  deleteNote,
  type NoteItem,
} from "@/lib/actions/notes";
import { getLeads, type LeadItem } from "@/lib/actions/leads";
import { relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";

export interface NotesClientProps {
  initialNotes?: NoteItem[];
  initialLeads?: LeadItem[];
}

export function NotesClient({ initialNotes, initialLeads }: NotesClientProps) {
  const { tr, isRTL } = useTranslation();
  const [notes, setNotes] = useState<NoteItem[] | null>(initialNotes || null);
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads || []);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "linked" | "unlinked">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NoteItem | null>(null);
  const [toDelete, setToDelete] = useState<NoteItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      try {
        const [notesRes, leadsRes] = await Promise.all([
          getNotes(),
          leads.length > 0 ? Promise.resolve({ leads }) : getLeads(),
        ]);
        setNotes(notesRes.notes);
        setLeads(leadsRes.leads);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load notes");
        setNotes([]);
      }
    });
  };

  useEffect(() => {
    if (!initialNotes) {
      load();
    }
  }, [initialNotes]);

  // ── KPI counts ───────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const list = notes || [];
    return {
      total: list.length,
      pinned: list.filter((n) => n.pinned).length,
      linked: list.filter((n) => n.lead || n.contact || n.deal).length,
      unlinked: list.filter((n) => !n.lead && !n.contact && !n.deal).length,
    };
  }, [notes]);

  const chipCounts = useMemo(() => ({
    all: kpis.total,
    pinned: kpis.pinned,
    linked: kpis.linked,
    unlinked: kpis.unlinked,
  }), [kpis]);

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!notes) return [];
    let list = notes;

    if (filter === "pinned") list = list.filter((n) => n.pinned);
    else if (filter === "linked") list = list.filter((n) => n.lead || n.contact || n.deal);
    else if (filter === "unlinked") list = list.filter((n) => !n.lead && !n.contact && !n.deal);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) => n.content?.toLowerCase().includes(q));
    }

    return list;
  }, [notes, filter, search]);

  const isActive = Boolean(search.trim() || filter !== "all");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (note: NoteItem) => {
    setEditing(note);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    load();
  };

  const handleTogglePin = async (note: NoteItem) => {
    const next = !note.pinned;
    // Optimistic update
    setNotes((prev) =>
      (prev || []).map((n) => (n._id === note._id ? { ...n, pinned: next } : n))
    );

    try {
      const res = await updateNote(note._id, { pinned: next });
      if (!res.success) {
        throw new Error(res.error || "Could not update note");
      }
      toast.success(next ? "Note pinned" : "Note unpinned");
      load();
    } catch (err: unknown) {
      setNotes((prev) =>
        (prev || []).map((n) => (n._id === note._id ? { ...n, pinned: note.pinned } : n))
      );
      toast.error(err instanceof Error ? err.message : "Could not update note");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await deleteNote(toDelete._id);
      if (res.success) {
        toast.success("Note deleted");
        setToDelete(null);
        load();
      } else {
        toast.error(res.error || "Could not delete note");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not delete note");
    } finally {
      setDeleting(false);
    }
  };

  const clearAll = () => {
    setSearch("");
    setFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader title={tr.notes.title} subtitle={tr.notes.subtitle}>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> {tr.notes.addNote}
        </Button>
      </PageHeader>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={StickyNote}
          tint="bg-brand-50 text-brand-600"
          label={tr.notes.title}
          value={kpis.total}
        />
        <StatTile
          icon={Pin}
          tint="bg-amber-50 text-amber-600"
          label={tr.notes.pinnedBadge}
          value={kpis.pinned}
        />
        <StatTile
          icon={Link2}
          tint="bg-sky-50 text-sky-600"
          label={tr.notes.relatedEntity}
          value={kpis.linked}
        />
        <StatTile
          icon={FileText}
          tint="bg-slate-50 text-slate-500"
          label="General"
          value={kpis.unlinked}
        />
      </div>

      {/* Toolbar */}
      <Card className="space-y-4 p-4">
        {/* Search row */}
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr.common.searchPlaceholder}
            className="h-10 w-full rounded-xl border border-line bg-surface ps-10 pe-4 text-sm text-ink placeholder:text-ink-soft/60 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Quick-filter chips + result count */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label={tr.common.all}
            count={chipCounts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label={tr.notes.pinnedBadge}
            count={chipCounts.pinned}
            active={filter === "pinned"}
            onClick={() => setFilter("pinned")}
          />
          <FilterChip
            label={tr.notes.relatedEntity}
            count={chipCounts.linked}
            active={filter === "linked"}
            onClick={() => setFilter("linked")}
          />
          <FilterChip
            label="General"
            count={chipCounts.unlinked}
            active={filter === "unlinked"}
            onClick={() => setFilter("unlinked")}
          />

          <div className="ms-auto flex items-center gap-3">
            {isActive && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition hover:text-ink cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> {tr.common.clear}
              </button>
            )}
            <span className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{filtered.length}</span> /{" "}
              {notes?.length ?? 0}
            </span>
          </div>
        </div>
      </Card>

      {/* Masonry grid / loading / empty */}
      {notes === null ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={isActive ? tr.common.noResults : tr.notes.noNotesMessage}
          description={
            isActive
              ? "Try adjusting your search or filters."
              : tr.notes.subtitle
          }
          action={
            !isActive ? (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> {tr.notes.addNote}
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Masonry via CSS columns */
        <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 *:mb-4">
          {filtered.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={openEdit}
              onDelete={setToDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* New / Edit dialog */}
      <NoteFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        note={editing}
        leads={leads}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={tr.notes.deleteNote}
        description={tr.common.deleteWarning}
        confirmLabel={tr.common.delete}
      />
    </div>
  );
}

// ── StatTile ─────────────────────────────────────────────────────────────
function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
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

// ── FilterChip ──────────────────────────────────────────────────────────────
function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition cursor-pointer",
        active
          ? "border-transparent bg-brand-600 text-white shadow-sm"
          : "border-line bg-surface text-ink-soft hover:bg-surface-muted hover:text-ink"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs font-semibold",
          active ? "bg-white/20 text-white" : "bg-surface-muted text-ink-soft"
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ── NoteCard ─────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: NoteItem;
  onEdit: (n: NoteItem) => void;
  onDelete: (n: NoteItem) => void;
  onTogglePin: (n: NoteItem) => void;
}) {
  const { tr } = useTranslation();
  const entity = note.lead ?? note.contact ?? note.deal ?? null;

  return (
    <div
      className={cn(
        "break-inside-avoid relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface p-5",
        "border border-line shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-pop)]",
        note.pinned && "ring-1 ring-brand-200"
      )}
    >
      {/* Pinned accent strip along the top */}
      {note.pinned && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl brand-gradient" />
      )}

      {/* Pinned icon badge */}
      {note.pinned && (
        <span className="absolute end-4 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-500">
          <Pin className="h-3.5 w-3.5" aria-label={tr.notes.pinnedBadge} />
        </span>
      )}

      {/* Note content */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink pe-6">
        {note.content}
      </p>

      {/* Footer: linked chip + timestamp + actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {entity && (
            <Badge className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border-brand-100 text-xs font-medium max-w-[160px] truncate">
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{entity.name}</span>
            </Badge>
          )}
          <span className="text-xs text-ink-soft">{relative(note.createdAt)}</span>
        </div>

        {/* Overflow menu */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Dropdown
            trigger={
              <button
                className="rounded-lg p-1.5 text-ink-soft transition hover:bg-surface-muted cursor-pointer"
                aria-label="Note options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
          >
            <DropdownItem onClick={() => onTogglePin(note)}>
              {note.pinned ? (
                <>
                  <PinOff className="h-4 w-4" /> Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4" /> {tr.notes.pinNote}
                </>
              )}
            </DropdownItem>
            <DropdownItem onClick={() => onEdit(note)}>
              <Pencil className="h-4 w-4" /> {tr.common.edit}
            </DropdownItem>
            <DropdownItem danger onClick={() => onDelete(note)}>
              <Trash2 className="h-4 w-4" /> {tr.common.delete}
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
