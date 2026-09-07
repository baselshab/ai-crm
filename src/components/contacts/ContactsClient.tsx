"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
  Star,
  Contact2,
  Tag,
  X,
  LayoutGrid,
  Table2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Button,
  Card,
  Badge,
  Avatar,
  Dropdown,
  DropdownItem,
  Spinner,
} from "@/components/ui";
import { ContactDrawer } from "@/components/contacts/ContactDrawer";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import {
  getContacts,
  updateContact,
  deleteContact,
  type ContactItem,
} from "@/lib/actions/contacts";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";

/* ─── useFlip ─────────────────────────────────────────────────────────────────
   FLIP animation: when the ordered list changes (e.g. a contact is starred and
   floats to the top), smoothly slide each card from its previous position to
   its new one. Reads element rects before/after the reorder.
   ──────────────────────────────────────────────────────────────────────────── */
function useFlip(dep: unknown) {
  const containerRef = useRef<HTMLDivElement | HTMLTableSectionElement | null>(null);
  const prevRects = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-flip-id]"));

    const nextRects = new Map<string, DOMRect>();
    nodes.forEach((n) => {
      const id = n.dataset.flipId;
      if (id) nextRects.set(id, n.getBoundingClientRect());
    });

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!reduce) {
      nodes.forEach((n) => {
        const id = n.dataset.flipId;
        if (!id) return;
        const oldRect = prevRects.current.get(id);
        const newRect = nextRects.get(id);
        if (!oldRect || !newRect) return;
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        if (dx || dy) {
          n.animate(
            [
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: "translate(0px, 0px)" },
            ],
            { duration: 350, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
          );
        }
      });
    }

    prevRects.current = nextRects;
  }, [dep]);

  return containerRef;
}

export interface ContactsClientProps {
  initialContacts?: ContactItem[];
}

export function ContactsClient({ initialContacts }: ContactsClientProps) {
  const { tr, isRTL } = useTranslation();
  const [contacts, setContacts] = useState<ContactItem[] | null>(initialContacts || null);
  const [filters, setFilters] = useState({ search: "", tag: "" });
  const [view, setView] = useState<"grid" | "table">("grid");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactItem | null>(null);
  const [selected, setSelected] = useState<ContactItem | null>(null);
  const [toDelete, setToDelete] = useState<ContactItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [favLoading, setFavLoading] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      try {
        const res = await getContacts();
        setContacts(res.contacts);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load contacts");
        setContacts([]);
      }
    });
  };

  useEffect(() => {
    if (!initialContacts) {
      load();
    }
  }, [initialContacts]);

  // ── Derived data ────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    if (!contacts) return [];
    const set = new Set<string>();
    contacts.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [contacts]);

  const tagCounts = useMemo(() => {
    const c: Record<string, number> = { All: contacts?.length || 0 };
    allTags.forEach((t) => {
      c[t] = (contacts || []).filter((contact) =>
        (contact.tags || []).includes(t)
      ).length;
    });
    return c;
  }, [contacts, allTags]);

  const kpis = useMemo(() => {
    const list = contacts || [];
    const favorites = list.filter((c) => c.favorite).length;
    const uniqueCompanies = new Set(list.map((c) => c.company).filter(Boolean)).size;
    const tagged = list.filter((c) => (c.tags || []).length > 0).length;
    return { total: list.length, favorites, companies: uniqueCompanies, tagged };
  }, [contacts]);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      if (filters.tag && !(c.tags || []).includes(filters.tag)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contacts, filters]);

  const ordered = useMemo(
    () => [...filtered].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)),
    [filtered]
  );

  const filtersActive = Boolean(filters.search || filters.tag);

  const gridRef = useFlip(ordered) as React.RefObject<HTMLDivElement>;
  const tableRef = useFlip(ordered) as React.RefObject<HTMLTableSectionElement>;

  // ── Handlers ──────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (contact: ContactItem) => {
    setSelected(null);
    setEditing(contact);
    setFormOpen(true);
  };

  const handleSaved = () => load();

  const toggleFavorite = async (e: React.MouseEvent, contact: ContactItem) => {
    e.stopPropagation();
    if (favLoading[contact._id]) return;
    const next = !contact.favorite;
    setFavLoading((prev) => ({ ...prev, [contact._id]: true }));

    // Optimistic UI update
    setContacts((prev) =>
      (prev || []).map((c) => (c._id === contact._id ? { ...c, favorite: next } : c))
    );

    try {
      const res = await updateContact(contact._id, { favorite: next });
      if (!res.success) {
        throw new Error(res.error || "Could not update favorite");
      }
    } catch (err: unknown) {
      // Revert on failure
      setContacts((prev) =>
        (prev || []).map((c) =>
          c._id === contact._id ? { ...c, favorite: !next } : c
        )
      );
      toast.error(err instanceof Error ? err.message : "Could not update favorite");
    } finally {
      setFavLoading((prev) => ({ ...prev, [contact._id]: false }));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await deleteContact(toDelete._id);
      if (res.success) {
        toast.success("Contact removed");
        setToDelete(null);
        setSelected(null);
        load();
      } else {
        toast.error(res.error || "Delete failed");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <PageHeader
        title={tr.contacts.title}
        subtitle={tr.contacts.subtitle}
      >
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> {tr.contacts.addContact}
        </Button>
      </PageHeader>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Users}
          tint="bg-brand-50 text-brand-600"
          label={tr.contacts.contactsCount}
          value={kpis.total}
        />
        <StatTile
          icon={Star}
          tint="bg-amber-50 text-amber-500"
          label={tr.contacts.favorites}
          value={kpis.favorites}
        />
        <StatTile
          icon={Building2}
          tint="bg-sky-50 text-sky-600"
          label={tr.contacts.companies}
          value={kpis.companies}
        />
        <StatTile
          icon={Tag}
          tint="bg-violet-50 text-violet-600"
          label={tr.contacts.tagged}
          value={kpis.tagged}
        />
      </div>

      {/* ── Toolbar Card ── */}
      <Card className="space-y-4 p-4">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={tr.contacts.searchPlaceholder}
            className="h-10 w-full rounded-xl border border-line bg-surface ps-10 pe-4 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
          />
        </div>

        {/* Tag chips + meta row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* "All" chip */}
          <TagChip
            label={tr.common.all}
            count={tagCounts.All}
            active={!filters.tag}
            onClick={() => setFilters({ ...filters, tag: "" })}
          />
          {/* One chip per unique tag */}
          {allTags.map((t) => (
            <TagChip
              key={t}
              label={t}
              count={tagCounts[t] || 0}
              active={filters.tag === t}
              onClick={() =>
                setFilters({ ...filters, tag: filters.tag === t ? "" : t })
              }
            />
          ))}

          {/* Right-aligned controls */}
          <div className="ms-auto flex items-center gap-3">
            {filtersActive && (
              <button
                onClick={() => setFilters({ search: "", tag: "" })}
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition hover:text-ink cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> {tr.common.clear}
              </button>
            )}
            <span className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{filtered.length}</span> /{" "}
              {contacts?.length ?? 0}
            </span>
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>
      </Card>

      {/* ── Results — loading / empty / grid / table ── */}
      {contacts === null ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Contact2}
          title={filtersActive ? tr.common.noResults : tr.contacts.title}
          description={
            filtersActive
              ? "Try different search terms or clear the tag filter."
              : "Add your first contact to start building your network."
          }
          action={
            !filtersActive ? (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> {tr.contacts.addContact}
              </Button>
            ) : null
          }
        />
      ) : view === "grid" ? (
        /* ── Card grid view ── */
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordered.map((contact) => (
            <ContactCard
              key={contact._id}
              contact={contact}
              flipId={contact._id}
              favLoading={Boolean(favLoading[contact._id])}
              onToggleFavorite={toggleFavorite}
              onOpen={() => setSelected(contact)}
              onEdit={() => openEdit(contact)}
              onDelete={() => setToDelete(contact)}
            />
          ))}
        </div>
      ) : (
        /* ── Table view ── */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted/40">
                <tr className="text-start text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-6 py-3.5 font-medium">{tr.common.contact}</th>
                  <th className="px-6 py-3.5 font-medium">{tr.contacts.jobTitle}</th>
                  <th className="px-6 py-3.5 font-medium">{tr.contacts.tags}</th>
                  <th className="px-6 py-3.5 font-medium">{tr.common.email}</th>
                  <th className="px-6 py-3.5 font-medium">{tr.common.phone}</th>
                  <th className="px-6 py-3.5 w-24" />
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {ordered.map((contact) => (
                  <ContactTableRow
                    key={contact._id}
                    contact={contact}
                    flipId={contact._id}
                    favLoading={Boolean(favLoading[contact._id])}
                    onToggleFavorite={toggleFavorite}
                    onOpen={() => setSelected(contact)}
                    onEdit={() => openEdit(contact)}
                    onDelete={() => setToDelete(contact)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Detail Drawer ── */}
      <ContactDrawer
        open={Boolean(selected)}
        contact={selected}
        onClose={() => setSelected(null)}
        onEdit={() => {
          if (selected) openEdit(selected);
        }}
        onDelete={() => {
          if (selected) setToDelete(selected);
        }}
      />

      {/* ── Add / Edit Dialog ── */}
      <ContactFormDialog
        open={formOpen}
        contact={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={tr.contacts.deleteContact}
        description={tr.contacts.deleteContactConfirm}
        confirmLabel={tr.common.delete}
      />
    </div>
  );
}

/* ─── StatTile ───────────────────────────────────────────────────────────────
   KPI card: tinted icon square + label + large value.
   ──────────────────────────────────────────────────────────────────────────── */
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
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            tint
          )}
        >
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

/* ─── TagChip ────────────────────────────────────────────────────────────────
   Quick-filter pill for a single tag.
   ──────────────────────────────────────────────────────────────────────────── */
function TagChip({
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
          : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-surface-muted"
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

/* ─── ViewToggle ─────────────────────────────────────────────────────────────
   Segmented Table2 / LayoutGrid icon toggle.
   ──────────────────────────────────────────────────────────────────────────── */
function ViewToggle({
  view,
  onChange,
}: {
  view: "grid" | "table";
  onChange: (v: "grid" | "table") => void;
}) {
  const options = [
    { value: "grid" as const, icon: LayoutGrid, label: "Card view" },
    { value: "table" as const, icon: Table2, label: "Table view" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-surface-muted p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          title={label}
          aria-label={label}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition cursor-pointer",
            view === value
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

/* ─── ContactCard ────────────────────────────────────────────────────────────
   Single premium contact tile for the card grid view.
   Shows avatar, name, title/company, favorite toggle, tags, email/phone.
   ──────────────────────────────────────────────────────────────────────────── */
function ContactCard({
  contact,
  flipId,
  favLoading,
  onToggleFavorite,
  onOpen,
  onEdit,
  onDelete,
}: {
  contact: ContactItem;
  flipId: string;
  favLoading: boolean;
  onToggleFavorite: (e: React.MouseEvent, c: ContactItem) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { tr } = useTranslation();
  return (
    <div
      data-flip-id={flipId}
      onClick={onOpen}
      className="relative cursor-pointer rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]"
    >
      {/* Favorite star */}
      <button
        onClick={(e) => onToggleFavorite(e, contact)}
        disabled={favLoading}
        aria-label={contact.favorite ? tr.contacts.favorites : tr.contacts.favorite}
        className="absolute end-4 top-4 rounded-lg p-1 text-ink-soft/40 transition hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 cursor-pointer"
      >
        <Star
          className={cn(
            "h-4 w-4 transition",
            contact.favorite ? "fill-amber-400 text-amber-400" : ""
          )}
        />
      </button>

      {/* Dropdown — positioned below the star */}
      <div
        className="absolute end-3 top-10 mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Dropdown
          trigger={
            <button className="rounded-lg p-1.5 text-ink-soft/50 transition hover:bg-surface-muted hover:text-ink-soft cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem onClick={onEdit}>
            <Pencil className="h-4 w-4" /> {tr.common.edit}
          </DropdownItem>
          <DropdownItem danger onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> {tr.common.delete}
          </DropdownItem>
        </Dropdown>
      </div>

      {/* Avatar + identity */}
      <div className="flex items-start gap-3 pe-8">
        <Avatar name={contact.name} size="md" />
        <div className="min-w-0">
          <p className="font-semibold text-ink leading-tight truncate">
            {contact.name}
          </p>
          {(contact.title || contact.company) && (
            <p className="mt-0.5 text-sm text-ink-soft truncate">
              {[contact.title, contact.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      {contact.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {contact.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              className="bg-brand-50 text-brand-700 text-[11px] px-2 py-0.5"
            >
              {tag}
            </Badge>
          ))}
          {contact.tags.length > 3 && (
            <Badge className="bg-surface-muted text-ink-soft text-[11px] px-2 py-0.5">
              +{contact.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Contact info rows */}
      <div className="mt-3 space-y-1.5">
        {contact.email && (
          <div className="flex items-center gap-2 text-sm text-ink-soft min-w-0">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{contact.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ContactTableRow ────────────────────────────────────────────────────────
   Single row for the table view.
   ──────────────────────────────────────────────────────────────────────────── */
function ContactTableRow({
  contact,
  flipId,
  favLoading,
  onToggleFavorite,
  onOpen,
  onEdit,
  onDelete,
}: {
  contact: ContactItem;
  flipId: string;
  favLoading: boolean;
  onToggleFavorite: (e: React.MouseEvent, c: ContactItem) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { tr } = useTranslation();
  return (
    <tr
      data-flip-id={flipId}
      onClick={onOpen}
      className="group cursor-pointer border-b border-line last:border-0 transition hover:bg-surface-muted/50"
    >
      {/* Contact (avatar + name + company) */}
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={contact.name} size="sm" />
          <div>
            <p className="font-medium text-ink">{contact.name}</p>
            <p className="text-xs text-ink-soft">
              {contact.company || contact.email || "—"}
            </p>
          </div>
        </div>
      </td>

      {/* Title */}
      <td className="px-6 py-3.5 text-sm text-ink-soft">
        {contact.title || "—"}
      </td>

      {/* Tags */}
      <td className="px-6 py-3.5">
        <div className="flex flex-wrap gap-1">
          {(contact.tags || []).slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              className="bg-brand-50 text-brand-700 text-[11px] px-2 py-0.5"
            >
              {tag}
            </Badge>
          ))}
          {(contact.tags || []).length > 2 && (
            <Badge className="bg-surface-muted text-ink-soft text-[11px] px-2 py-0.5">
              +{contact.tags.length - 2}
            </Badge>
          )}
          {!(contact.tags?.length) && (
            <span className="text-xs text-ink-soft/50">—</span>
          )}
        </div>
      </td>

      {/* Email */}
      <td className="px-6 py-3.5 text-sm text-ink-soft">
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-brand-700 hover:underline transition"
          >
            {contact.email}
          </a>
        ) : (
          "—"
        )}
      </td>

      {/* Phone */}
      <td className="px-6 py-3.5 text-sm text-ink-soft">
        {contact.phone || "—"}
      </td>

      {/* Actions */}
      <td className="px-6 py-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {/* Favorite star */}
          <button
            onClick={(e) => onToggleFavorite(e, contact)}
            disabled={favLoading}
            aria-label={contact.favorite ? tr.contacts.favorites : tr.contacts.favorite}
            className="rounded-lg p-1.5 text-ink-soft/40 transition hover:text-amber-400 cursor-pointer"
          >
            <Star
              className={cn(
                "h-4 w-4 transition",
                contact.favorite ? "fill-amber-400 text-amber-400" : ""
              )}
            />
          </button>
          <Dropdown
            trigger={
              <button className="rounded-lg p-1.5 text-ink-soft transition hover:bg-surface-muted cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
          >
            <DropdownItem onClick={onEdit}>
              <Pencil className="h-4 w-4" /> {tr.common.edit}
            </DropdownItem>
            <DropdownItem danger onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> {tr.common.delete}
            </DropdownItem>
          </Dropdown>
        </div>
      </td>
    </tr>
  );
}
