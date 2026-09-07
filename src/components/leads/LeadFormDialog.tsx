"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { createLead, updateLead, type LeadItem } from "@/lib/actions/leads";
import { LEAD_STAGES, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/constants";
import { useTranslation } from "@/i18n/LanguageContext";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  priority: string;
  source: string;
  value: number | string;
  notes: string;
}

export interface LeadFormDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: LeadItem | null;
  onSaved?: (lead: LeadItem) => void;
}

/**
 * Create / edit a lead. When `lead` is provided we're editing; otherwise
 * creating. Calls `onSaved(lead)` so the parent can refresh its list.
 */
export function LeadFormDialog({ open, onClose, lead, onSaved }: LeadFormDialogProps) {
  const { tr } = useTranslation();
  const editing = Boolean(lead?._id || lead?.id);
  const leadId = lead?._id || lead?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  // Reset the form whenever the target lead changes / dialog opens.
  useEffect(() => {
    if (!open) return;
    reset({
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      company: lead?.company || "",
      status: lead?.status || "New",
      priority: lead?.priority || "Medium",
      source: lead?.source || "Website",
      value: lead?.value ?? 0,
      notes: lead?.notes || "",
    });
  }, [open, lead, reset]);

  const onSubmit = async (form: FormValues) => {
    const payload = {
      ...form,
      value: Number(form.value) || 0,
    };

    try {
      const res = editing && leadId
        ? await updateLead(leadId, payload)
        : await createLead(payload);

      if (!res.success) {
        toast.error(res.error || "Could not save lead");
        return;
      }

      toast.success(editing ? "Lead updated successfully" : "Lead created successfully");
      if (res.lead) {
        onSaved?.(res.lead);
      }
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? tr.leads.editLead : tr.leads.addLead}
      description={editing ? "Update this lead's details." : "Add a lead to your pipeline."}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr.leads.leadName} error={errors.name?.message} className="col-span-2">
            <Input
              placeholder="Contact name"
              {...register("name", { required: "Name is required" })}
            />
          </Field>
          <Field label={tr.leads.companyName}>
            <Input placeholder="Company" {...register("company")} />
          </Field>
          <Field label={tr.common.email}>
            <Input type="email" placeholder="email@company.com" {...register("email")} />
          </Field>
          <Field label={tr.common.phone}>
            <Input placeholder="+1 555 0100" {...register("phone")} />
          </Field>
          <Field label={tr.leads.dealValue}>
            <Input type="number" min="0" placeholder="0" {...register("value")} />
          </Field>
          <Field label={tr.leads.stageLabel}>
            <Select {...register("status")}>
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>{tr.stages[s as keyof typeof tr.stages] || s}</option>
              ))}
            </Select>
          </Field>
          <Field label={tr.leads.priorityLabel}>
            <Select {...register("priority")}>
              {LEAD_PRIORITIES.map((p) => (
                <option key={p} value={p}>{tr.priorities[p as keyof typeof tr.priorities] || p}</option>
              ))}
            </Select>
          </Field>
          <Field label={tr.leads.sourceLabel} className="col-span-2">
            <Select {...register("source")}>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{tr.sources[s as keyof typeof tr.sources] || s}</option>
              ))}
            </Select>
          </Field>
          <Field label={tr.leads.notesLabel} className="col-span-2">
            <Textarea placeholder="Context, next steps…" {...register("notes")} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            {tr.common.cancel}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? tr.common.saveChanges : tr.common.create}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
