"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  Button,
  Input,
  Textarea,
  Select,
  Field,
} from "@/components/ui";
import {
  createTask,
  updateTask,
  type TaskItem,
  type TaskFormInput,
} from "@/lib/actions/tasks";
import { dateInputValue } from "@/lib/format";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { useTranslation } from "@/i18n/LanguageContext";

interface FormValues {
  title: string;
  description: string;
  dueDate: string;
  status: string;
  priority: string;
  relatedLead: string;
}

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  task?: TaskItem | null;
  leads?: { _id: string; id?: string; name: string; company?: string | null }[];
  onSaved: () => void;
}

export function TaskFormDialog({
  open,
  onClose,
  task,
  leads = [],
  onSaved,
}: TaskFormDialogProps) {
  const { tr } = useTranslation();
  const isEdit = Boolean(task);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset(
        task
          ? {
              title: task.title ?? "",
              description: task.description ?? "",
              dueDate: dateInputValue(task.dueDate),
              status: task.status ?? "Pending",
              priority: task.priority ?? "Medium",
              relatedLead: task.relatedLead?._id ?? task.leadId ?? "",
            }
          : {
              title: "",
              description: "",
              dueDate: "",
              status: "Pending",
              priority: "Medium",
              relatedLead: "",
            }
      );
    }
  }, [open, task, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: TaskFormInput = {
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      dueDate: values.dueDate || undefined,
      status: values.status,
      priority: values.priority,
      relatedLead: values.relatedLead || null,
    };

    try {
      if (isEdit && task) {
        const res = await updateTask(task._id, payload);
        if (!res.success) {
          toast.error(res.error || "Could not update task");
          return;
        }
        toast.success("Task updated");
      } else {
        const res = await createTask(payload);
        if (!res.success) {
          toast.error(res.error || "Could not create task");
          return;
        }
        toast.success("Task created");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? tr.tasks.editTask : tr.tasks.addTask}
      description={
        isEdit
          ? "Update the details below."
          : "Fill in the details to create a task."
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <Field label={tr.tasks.taskTitle} error={errors.title?.message}>
          <Input
            placeholder="e.g. Follow up with Acme Corp"
            {...register("title", { required: "Title is required" })}
            autoFocus
          />
        </Field>

        {/* Description */}
        <Field label={tr.tasks.description}>
          <Textarea
            rows={3}
            placeholder="Optional notes…"
            {...register("description")}
          />
        </Field>

        {/* Due date + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr.tasks.dueDate}>
            <Input type="date" {...register("dueDate")} />
          </Field>
          <Field label={tr.common.priority}>
            <Select {...register("priority")}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {tr.priorities[p as keyof typeof tr.priorities] || p}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Status */}
        <Field label={tr.common.status}>
          <Select {...register("status")}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tr.taskStatuses[s as keyof typeof tr.taskStatuses] || s}
              </option>
            ))}
          </Select>
        </Field>

        {/* Linked lead */}
        <Field label={tr.tasks.relatedLead}>
          <Select {...register("relatedLead")}>
            <option value="">No linked lead</option>
            {leads.map((l) => (
              <option key={l._id || l.id} value={l._id || l.id}>
                {l.name}
                {l.company ? ` — ${l.company}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {tr.common.cancel}
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting}>
            {isEdit ? tr.common.saveChanges : tr.tasks.addTask}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
