"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  Button,
  Textarea,
  Select,
  Field,
} from "@/components/ui";
import {
  createNote,
  updateNote,
  type NoteItem,
  type NoteFormInput,
} from "@/lib/actions/notes";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";

interface FormValues {
  content: string;
  lead: string;
  pinned: boolean;
}

export interface NoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  note?: NoteItem | null;
  leads?: { _id: string; id?: string; name: string; company?: string | null }[];
  onSaved: () => void;
}

export function NoteFormDialog({
  open,
  onClose,
  note,
  leads = [],
  onSaved,
}: NoteFormDialogProps) {
  const { tr, isRTL } = useTranslation();
  const isEditing = Boolean(note);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        content: note?.content ?? "",
        lead: note?.lead?._id ?? note?.leadId ?? "",
        pinned: note?.pinned ?? false,
      });
    }
  }, [open, note, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: NoteFormInput = {
      content: values.content,
      pinned: values.pinned,
      lead: values.lead || undefined,
    };

    try {
      if (isEditing && note) {
        const res = await updateNote(note._id, payload);
        if (!res.success) {
          toast.error(res.error || "Could not save note");
          return;
        }
        toast.success("Note updated");
      } else {
        const res = await createNote(payload);
        if (!res.success) {
          toast.error(res.error || "Could not create note");
          return;
        }
        toast.success("Note created");
      }
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save note");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? tr.notes.editNote : tr.notes.addNote}
      description={
        isEditing
          ? "Update your note below."
          : "Add a note linked to a lead or contact."
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
        {/* Content */}
        <Field label={tr.notes.noteContent} error={errors.content?.message}>
          <Textarea
            rows={6}
            placeholder="Write your note here…"
            {...register("content", { required: "Note content is required." })}
            autoFocus
          />
        </Field>

        {/* Lead picker */}
        <Field label={tr.notes.relatedEntity}>
          <Select {...register("lead")}>
            <option value="">No linked lead</option>
            {leads.map((l) => (
              <option key={l._id || l.id} value={l._id || l.id}>
                {l.name}{l.company ? ` — ${l.company}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        {/* Pinned pill toggle */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-muted/40 px-4 py-3 transition hover:bg-surface-muted/70 select-none">
          <div className="relative flex-shrink-0">
            <input type="checkbox" className="peer sr-only" {...register("pinned")} />
            <div className="h-5 w-9 rounded-full bg-line transition peer-checked:bg-brand-500" />
            <div className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition",
              isRTL
                ? "right-0.5 peer-checked:-translate-x-4"
                : "left-0.5 peer-checked:translate-x-4"
            )} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{tr.notes.pinNote}</p>
            <p className="text-xs text-ink-soft">Pinned notes appear at the top of the list.</p>
          </div>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {tr.common.cancel}
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting}>
            {isEditing ? tr.common.saveChanges : tr.notes.addNote}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
