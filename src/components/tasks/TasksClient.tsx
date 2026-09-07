"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { isPast, isToday } from "date-fns";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarCheck,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatCard } from "@/components/common/StatCard";
import {
  Button,
  Card,
  Badge,
  Dropdown,
  DropdownItem,
  Tabs,
  Spinner,
} from "@/components/ui";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import {
  getTasks,
  updateTask,
  deleteTask,
  type TaskItem,
} from "@/lib/actions/tasks";
import { getLeads, type LeadItem } from "@/lib/actions/leads";
import { shortDate } from "@/lib/format";
import {
  TASK_STATUS_STYLES,
  PRIORITY_STYLES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";

// ─── Priority accent bar colours ──────────────────────────────────────────────
const PRIORITY_BAR: Record<string, string> = {
  High: "bg-rose-400",
  Medium: "bg-amber-400",
  Low: "bg-slate-300",
};

// ─── Helper: is a task overdue? ──────────────────────────────────────────────
function isOverdue(task: TaskItem) {
  if (!task.dueDate || task.status === "Completed") return false;
  const d = new Date(task.dueDate);
  return isPast(d) && !isToday(d);
}

// ─── Helper: assign a task to a group key ────────────────────────────────────
function groupKey(task: TaskItem) {
  if (task.status === "Completed") return "completed";
  if (!task.dueDate) return "nodate";
  const d = new Date(task.dueDate);
  if (isToday(d)) return "today";
  if (isPast(d)) return "overdue";
  return "upcoming";
}

export interface TasksClientProps {
  initialTasks?: TaskItem[];
  initialLeads?: LeadItem[];
}

export function TasksClient({ initialTasks, initialLeads }: TasksClientProps) {
  const { tr, isRTL } = useTranslation();

  const groups = useMemo(() => [
    { key: "overdue", label: tr.tasks.overdue, labelClass: "text-rose-700", countClass: "bg-rose-50 text-rose-700" },
    { key: "today", label: tr.tasks.dueToday, labelClass: "text-amber-700", countClass: "bg-amber-50 text-amber-700" },
    { key: "upcoming", label: tr.tasks.upcoming, labelClass: "text-ink", countClass: "bg-surface-muted text-ink-soft" },
    { key: "nodate", label: tr.tasks.dueDate, labelClass: "text-ink-soft", countClass: "bg-surface-muted text-ink-soft" },
    { key: "completed", label: tr.taskStatuses.Completed, labelClass: "text-brand-700", countClass: "bg-brand-50 text-brand-700" },
  ], [tr]);

  const statusTabs = useMemo(() => [
    { value: "all", label: tr.common.all },
    { value: "Pending", label: tr.taskStatuses.Pending },
    { value: "In Progress", label: tr.taskStatuses["In Progress"] },
    { value: "Completed", label: tr.taskStatuses.Completed },
  ], [tr]);
  const [tasks, setTasks] = useState<TaskItem[] | null>(initialTasks || null);
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads || []);

  const [tab, setTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [toDelete, setToDelete] = useState<TaskItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      try {
        const [tasksRes, leadsRes] = await Promise.all([
          getTasks(),
          leads.length > 0 ? Promise.resolve({ leads }) : getLeads(),
        ]);
        setTasks(tasksRes.tasks);
        setLeads(leadsRes.leads);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load follow-ups");
        setTasks([]);
      }
    });
  };

  useEffect(() => {
    if (!initialTasks) {
      load();
    }
  }, [initialTasks]);

  // ── KPI counts ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, pending: 0, overdue: 0, completed: 0 };
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "Pending").length,
      overdue: tasks.filter(isOverdue).length,
      completed: tasks.filter((t) => t.status === "Completed").length,
    };
  }, [tasks]);

  // ── Tab-filtered list ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (tab === "all") return tasks;
    return tasks.filter((t) => t.status === tab);
  }, [tasks, tab]);

  // ── Group the filtered tasks into timeline buckets ────────────────────────
  const groupedSections = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    groups.forEach((g) => (map[g.key] = []));
    filtered.forEach((t) => {
      const key = groupKey(t);
      if (map[key]) {
        map[key].push(t);
      }
    });
    return groups.filter((g) => map[g.key].length > 0).map((g) => ({
      ...g,
      tasks: map[g.key],
    }));
  }, [filtered, groups]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (task: TaskItem) => {
    setEditing(task);
    setFormOpen(true);
  };

  /** Toggle task: Completed ↔ Pending */
  const handleToggle = async (task: TaskItem) => {
    const next = task.status === "Completed" ? "Pending" : "Completed";

    // Optimistic update
    setTasks((prev) =>
      (prev || []).map((t) => (t._id === task._id ? { ...t, status: next } : t))
    );

    try {
      const res = await updateTask(task._id, { status: next });
      if (!res.success) {
        throw new Error(res.error || "Could not update task");
      }
    } catch (err: unknown) {
      // Revert on failure
      setTasks((prev) =>
        (prev || []).map((t) => (t._id === task._id ? { ...t, status: task.status } : t))
      );
      toast.error(err instanceof Error ? err.message : "Could not update task");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await deleteTask(toDelete._id);
      if (res.success) {
        toast.success("Task deleted");
        setToDelete(null);
        load();
      } else {
        toast.error(res.error || "Could not delete task");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not delete task");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader title={tr.tasks.title} subtitle={tr.tasks.subtitle}>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> {tr.tasks.addTask}
        </Button>
      </PageHeader>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={tr.tasks.title} value={stats.total} icon={CalendarCheck} />
        <StatCard label={tr.taskStatuses.Pending} value={stats.pending} icon={Circle} />
        <StatCard label={tr.tasks.overdue} value={stats.overdue} icon={AlertTriangle} />
        <StatCard label={tr.taskStatuses.Completed} value={stats.completed} icon={CheckCircle2} accent />
      </div>

      {/* Completion progress bar */}
      {tasks !== null && (
        <ProgressCard completed={stats.completed} total={stats.total} />
      )}

      {/* Status filter tabs + grouped task list */}
      <Card className="overflow-hidden">
        {/* Tabs toolbar */}
        <div className="border-b border-line px-5 py-3">
          <Tabs value={tab} onChange={setTab} tabs={statusTabs} />
        </div>

        {/* Body */}
        {tasks === null ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={tr.tasks.noTasksMessage}
            description={
              tab === "all"
                ? tr.tasks.subtitle
                : `${tr.common.noResults} (${tab})`
            }
            action={
              tab === "all" ? (
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" /> {tr.tasks.addTask}
                </Button>
              ) : null
            }
          />
        ) : (
          <div>
            {groupedSections.map((group) => (
              <div key={group.key}>
                <GroupHeader
                  label={group.label}
                  count={group.tasks.length}
                  labelClass={group.labelClass}
                  countClass={group.countClass}
                />
                <div className="divide-y divide-line">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task._id}
                      task={task}
                      onToggle={handleToggle}
                      onEdit={openEdit}
                      onDelete={setToDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add / Edit dialog */}
      <TaskFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editing}
        leads={leads}
        onSaved={load}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={tr.common.delete}
        description={`"${toDelete?.title}" ${tr.common.deleteWarning}`}
        confirmLabel={tr.common.delete}
      />
    </div>
  );
}

// ─── Single task row ─────────────────────────────────────────────────────────
function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  onToggle: (t: TaskItem) => void;
  onEdit: (t: TaskItem) => void;
  onDelete: (t: TaskItem) => void;
}) {
  const { tr } = useTranslation();
  const done = task.status === "Completed";
  const inProg = task.status === "In Progress";
  const overdue = isOverdue(task);
  const dueToday = task.dueDate ? isToday(new Date(task.dueDate)) : false;

  return (
    <div className="group relative flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-muted/50">
      {/* Priority accent bar */}
      <span
        aria-hidden
        className={cn(
          "absolute start-0 top-3 bottom-3 w-[3px] rounded-full",
          PRIORITY_BAR[task.priority] ?? "bg-slate-300"
        )}
      />

      {/* Status toggle */}
      <button
        onClick={() => onToggle(task)}
        aria-label={done ? tr.tasks.markPending : tr.tasks.markComplete}
        className={cn(
          "mt-0.5 shrink-0 rounded-full p-0.5 transition-colors cursor-pointer",
          done
            ? "text-brand-600 hover:text-brand-400"
            : inProg
            ? "text-sky-500 hover:text-brand-500"
            : "text-ink-soft hover:text-brand-500"
        )}
      >
        {done ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : inProg ? (
          <CircleDot className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            done ? "line-through text-ink-soft" : "text-ink"
          )}
        >
          {task.title}
        </p>

        {task.description && (
          <p className="mt-0.5 truncate text-xs text-ink-soft">{task.description}</p>
        )}

        {/* Meta chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium",
                overdue
                  ? "bg-rose-50 text-rose-700"
                  : dueToday
                  ? "bg-amber-50 text-amber-700"
                  : "bg-surface-muted text-ink-soft"
              )}
            >
              {overdue ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {overdue
                ? `${tr.tasks.overdue} · ${shortDate(task.dueDate)}`
                : dueToday
                ? `${tr.tasks.dueToday} · ${shortDate(task.dueDate)}`
                : shortDate(task.dueDate)}
            </span>
          )}

          <Badge className={cn("text-xs", PRIORITY_STYLES[task.priority])}>
            {tr.priorities[task.priority as keyof typeof tr.priorities] || task.priority}
          </Badge>

          <Badge className={cn("text-xs", TASK_STATUS_STYLES[task.status])}>
            {tr.taskStatuses[task.status as keyof typeof tr.taskStatuses] || task.status}
          </Badge>

          {task.relatedLead && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              <Building2 className="h-3 w-3" />
              {task.relatedLead.name}
            </span>
          )}
        </div>
      </div>

      {/* Row actions */}
      <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <Dropdown
          trigger={
            <button className="rounded-lg p-1.5 text-ink-soft transition hover:bg-surface-muted hover:text-ink cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem onClick={() => onEdit(task)}>
            <Pencil className="h-4 w-4" /> {tr.common.edit}
          </DropdownItem>
          <DropdownItem danger onClick={() => onDelete(task)}>
            <Trash2 className="h-4 w-4" /> {tr.common.delete}
          </DropdownItem>
        </Dropdown>
      </div>
    </div>
  );
}

// ─── Group section header ────────────────────────────────────────────────────
function GroupHeader({
  label,
  count,
  labelClass,
  countClass,
}: {
  label: string;
  count: number;
  labelClass: string;
  countClass: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line bg-surface-muted/30 px-5 py-2">
      <span className={cn("text-xs font-semibold uppercase tracking-wide", labelClass)}>
        {label}
      </span>
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", countClass)}>
        {count}
      </span>
    </div>
  );
}

// ─── Completion progress bar card ────────────────────────────────────────────
function ProgressCard({ completed, total }: { completed: number; total: number }) {
  const { tr } = useTranslation();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink">
          {completed} / {total} {tr.taskStatuses.Completed}
        </span>
        <span className="text-sm font-semibold text-brand-700">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
        <div
          className="h-full rounded-full brand-gradient transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}
