"use client";

import React from "react";
import {
  Mail,
  Phone,
  Building2,
  Star,
  Tag,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Drawer,
  Button,
  Badge,
  Avatar,
} from "@/components/ui";
import { relative, shortDate } from "@/lib/format";
import type { ContactItem } from "@/lib/actions/contacts";
import { useTranslation } from "@/i18n/LanguageContext";

export interface ContactDrawerProps {
  open: boolean;
  contact?: ContactItem | null;
  onClose: () => void;
  onEdit: (contact: ContactItem) => void;
  onDelete: (contact: ContactItem) => void;
}

export function ContactDrawer({
  open,
  contact,
  onClose,
  onEdit,
  onDelete,
}: ContactDrawerProps) {
  const { tr } = useTranslation();
  if (!contact) return null;

  return (
    <Drawer open={open} onClose={onClose} title={tr.contacts.contactDetails}>
      <div className="space-y-6">
        {/* Identity hero */}
        <div className="flex items-center gap-4">
          <Avatar name={contact.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">{contact.name}</h2>
              {contact.favorite && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>
            {(contact.title || contact.company) && (
              <p className="text-sm text-ink-soft mt-0.5">
                {[contact.title, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
            {contact.favorite && (
              <Badge className="mt-1.5 bg-amber-50 text-amber-700 text-[11px]">
                {tr.contacts.favorites}
              </Badge>
            )}
          </div>
        </div>

        {/* Contact fields */}
        <div className="rounded-2xl border border-line divide-y divide-line">
          {contact.email && (
            <DrawerRow icon={<Mail className="h-4 w-4" />} label={tr.common.email}>
              <a
                href={`mailto:${contact.email}`}
                className="text-brand-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.email}
              </a>
            </DrawerRow>
          )}
          {contact.phone && (
            <DrawerRow icon={<Phone className="h-4 w-4" />} label={tr.common.phone}>
              <a
                href={`tel:${contact.phone}`}
                className="text-brand-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.phone}
              </a>
            </DrawerRow>
          )}
          {contact.company && (
            <DrawerRow icon={<Building2 className="h-4 w-4" />} label={tr.common.company}>
              <span className="text-ink">{contact.company}</span>
            </DrawerRow>
          )}
        </div>

        {/* Tags */}
        {contact.tags?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink-soft uppercase tracking-wide mb-2">
              <Tag className="h-3.5 w-3.5" /> {tr.contacts.tags}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <Badge key={tag} className="bg-brand-50 text-brand-700">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div>
            <p className="text-xs font-medium text-ink-soft uppercase tracking-wide mb-2">
              {tr.common.notes}
            </p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-line rounded-xl bg-surface-muted px-4 py-3">
              {contact.notes}
            </p>
          </div>
        )}

        {/* Meta */}
        <p className="text-xs text-ink-soft">
          {tr.leads.added} {shortDate(contact.createdAt)}{" "}
          <span className="opacity-60">({relative(contact.createdAt)})</span>
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2 border-t border-line">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onEdit(contact);
            }}
          >
            <Pencil className="h-4 w-4" /> {tr.common.edit}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onDelete(contact);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function DrawerRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-ink-soft shrink-0">{icon}</span>
      <span className="text-xs text-ink-soft w-16 shrink-0">{label}</span>
      <span className="text-sm min-w-0">{children}</span>
    </div>
  );
}
