"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Tag, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  Button,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import {
  createContact,
  updateContact,
  type ContactItem,
} from "@/lib/actions/contacts";
import { useTranslation } from "@/i18n/LanguageContext";

interface FormValues {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  tags: string;
  notes: string;
  favorite: boolean;
}

export interface ContactFormDialogProps {
  open: boolean;
  contact?: ContactItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ContactFormDialog({
  open,
  contact,
  onClose,
  onSaved,
}: ContactFormDialogProps) {
  const { tr } = useTranslation();
  const isEdit = Boolean(contact);
  const contactId = contact?._id || contact?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset(
        contact
          ? {
              name: contact.name || "",
              title: contact.title || "",
              company: contact.company || "",
              email: contact.email || "",
              phone: contact.phone || "",
              tags: (contact.tags || []).join(", "),
              notes: contact.notes || "",
              favorite: Boolean(contact.favorite),
            }
          : {
              name: "",
              title: "",
              company: "",
              email: "",
              phone: "",
              tags: "",
              notes: "",
              favorite: false,
            }
      );
    }
  }, [open, contact, reset]);

  const onSubmit = async (values: FormValues) => {
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const payload = {
      name: values.name,
      title: values.title,
      company: values.company,
      email: values.email,
      phone: values.phone,
      notes: values.notes,
      favorite: values.favorite,
      tags,
    };

    try {
      if (isEdit && contactId) {
        const res = await updateContact(contactId, payload);
        if (!res.success) {
          toast.error(res.error || "Could not update contact");
          return;
        }
        toast.success("Contact updated");
      } else {
        const res = await createContact(payload);
        if (!res.success) {
          toast.error(res.error || "Could not add contact");
          return;
        }
        toast.success("Contact added");
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
      title={isEdit ? tr.contacts.editContact : tr.contacts.addContact}
      description={
        isEdit
          ? "Update the details below."
          : "Fill in the details to add a new contact."
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        {/* Name (required) */}
        <Field label={tr.contacts.fullName} error={errors.name?.message}>
          <Input
            {...register("name", { required: "Name is required" })}
            placeholder="Jane Doe"
            autoFocus
          />
        </Field>

        {/* Title + Company in a two-column row */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr.contacts.jobTitle}>
            <Input {...register("title")} placeholder="Head of Design" />
          </Field>
          <Field label={tr.common.company}>
            <Input {...register("company")} placeholder="Acme Inc." />
          </Field>
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr.common.email}>
            <Input
              {...register("email")}
              type="email"
              placeholder="jane@acme.com"
            />
          </Field>
          <Field label={tr.common.phone}>
            <Input
              {...register("phone")}
              type="tel"
              placeholder="+1 555 000 0000"
            />
          </Field>
        </div>

        {/* Tags — comma-separated */}
        <Field label={tr.contacts.tags} error={errors.tags?.message}>
          <div className="relative">
            <Tag className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input
              {...register("tags")}
              placeholder="e.g. client, vip, partner"
              className="ps-10"
            />
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Separate multiple tags with commas.
          </p>
        </Field>

        {/* Notes */}
        <Field label={tr.common.notes}>
          <Textarea
            {...register("notes")}
            placeholder="Any relevant context, history, or reminders…"
            rows={3}
          />
        </Field>

        {/* Favorite toggle */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 transition hover:bg-surface-muted select-none">
          <input
            type="checkbox"
            {...register("favorite")}
            className="h-4 w-4 rounded accent-brand-600 cursor-pointer"
          />
          <div>
            <p className="text-sm font-medium text-ink">{tr.contacts.favorite}</p>
            <p className="text-xs text-ink-soft">
              Starred contacts appear highlighted in your grid.
            </p>
          </div>
          <Star className="ms-auto h-4 w-4 text-amber-400" />
        </label>

        {/* Form actions */}
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
            {isEdit ? tr.common.saveChanges : tr.contacts.addContact}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
