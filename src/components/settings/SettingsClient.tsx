"use client";

import React, { useState, useTransition } from "react";
import { Role } from "@/generated/prisma/enums";
import { User, ShieldCheck, Pencil, Plus, Check, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  updateOrganizationName,
  addMemberToOrganization,
  type OrganizationDetails,
} from "@/lib/actions/organization";

interface SettingsClientProps {
  tenant: {
    user: {
      name?: string | null;
      email: string;
    };
    role: Role;
  };
  organization: OrganizationDetails;
}

export function SettingsClient({ tenant, organization }: SettingsClientProps) {
  const { tr, isRTL } = useTranslation();
  const [orgName, setOrgName] = useState(organization.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [namePending, startNameTransition] = useTransition();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.MEMBER);
  const [invitePending, startInviteTransition] = useTransition();

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = tenant.role === Role.OWNER || tenant.role === Role.ADMIN;

  const roleLabel = (r: Role | string) => {
    if (r === Role.OWNER || r === "OWNER") return tr.settings.roleOwner;
    if (r === Role.ADMIN || r === "ADMIN") return tr.settings.roleAdmin;
    return tr.settings.roleMember;
  };

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startNameTransition(async () => {
      const res = await updateOrganizationName(orgName);
      if (res.success) {
        setIsEditingName(false);
        setMessage({ type: "success", text: isRTL ? "تم تحديث اسم المؤسسة بنجاح." : "Workspace name updated successfully." });
      } else {
        setMessage({ type: "error", text: res.error || (isRTL ? "فشل التحديث" : "Update failed") });
      }
    });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startInviteTransition(async () => {
      const res = await addMemberToOrganization(inviteEmail, inviteRole);
      if (res.success) {
        setInviteEmail("");
        setMessage({ type: "success", text: res.message || (isRTL ? "تمت إضافة العضو بنجاح." : "Member added successfully.") });
      } else {
        setMessage({ type: "error", text: res.error || (isRTL ? "فشل إضافة العضو." : "Failed to add member.") });
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {tr.settings.title}
        </h1>
        <p className="text-sm text-ink-soft">
          {tr.settings.subtitle}
        </p>
      </div>

      {/* User Profile Card */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="brand-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm">
              {tenant.user.name ? tenant.user.name.slice(0, 2).toUpperCase() : <User className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                {tenant.user.name || (isRTL ? "مستخدم" : "User")}
              </h2>
              <p className="font-mono text-xs text-ink-soft">
                {tenant.user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-soft">{tr.settings.currentRole}:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              {roleLabel(tenant.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Organization & Team Management Section */}
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-ink tracking-tight">
                {tr.settings.workspaceTitle}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-brand-50 text-brand-700 border border-brand-200">
                Multi-Tenant Scope
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-1">
              Tenant ID: <code className="text-brand-600 font-mono">{organization.id}</code>
            </p>
          </div>

          {/* Name Edit / View */}
          {canEdit && !isEditingName ? (
            <button
              onClick={() => setIsEditingName(true)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-muted text-ink transition cursor-pointer font-medium"
            >
              <Pencil className="h-3.5 w-3.5" />
              {tr.common.edit} {tr.settings.workspaceName}
            </button>
          ) : null}
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            <span>{message.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Edit Organization Name Form */}
        {isEditingName && (
          <form onSubmit={handleUpdateName} className="p-4 rounded-xl bg-surface-muted/60 border border-line space-y-3">
            <label className="text-xs text-ink font-semibold block">
              {tr.settings.workspaceName}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="flex-1 bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand-500"
                required
              />
              <button
                type="submit"
                disabled={namePending}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition cursor-pointer"
              >
                {namePending ? tr.common.saving : tr.common.save}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setOrgName(organization.name);
                }}
                className="px-3 py-2 bg-surface hover:bg-surface-muted border border-line text-ink-soft text-xs rounded-xl transition cursor-pointer"
              >
                {tr.common.cancel}
              </button>
            </div>
          </form>
        )}

        {/* Add Member Form (For OWNER & ADMIN) */}
        {canEdit && (
          <div className="p-4 rounded-xl bg-surface-muted/40 border border-line space-y-3">
            <h3 className="text-sm font-semibold text-ink">
              {tr.settings.addMember}
            </h3>
            <p className="text-xs text-ink-soft">
              {isRTL
                ? "أدخل البريد الإلكتروني لمستخدم مسجل لمنحه وصولاً إلى هذه المؤسسة بصلاحية محددة."
                : "Enter the email of a registered user to grant them access to this workspace with a specified role."}
            </p>

            <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="email"
                placeholder={tr.settings.memberEmail}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="sm:col-span-7 bg-surface border border-line rounded-xl px-3 py-2 text-xs text-ink placeholder-ink-soft/60 focus:outline-none focus:border-brand-500"
              />

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="sm:col-span-3 bg-surface border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-brand-500"
              >
                <option value={Role.MEMBER}>{tr.settings.roleMember}</option>
                <option value={Role.ADMIN}>{tr.settings.roleAdmin}</option>
              </select>

              <button
                type="submit"
                disabled={invitePending}
                className="sm:col-span-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                {invitePending ? tr.common.saving : tr.common.create}
              </button>
            </form>
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink flex items-center justify-between">
            <span>
              {tr.settings.membersTitle} ({organization.members.length})
            </span>
            <span className="text-xs font-normal text-ink-soft">
              {tr.settings.currentRole}: <strong className="text-brand-600 font-semibold">{roleLabel(tenant.role)}</strong>
            </span>
          </h3>

          <div className="divide-y divide-line border border-line rounded-xl overflow-hidden bg-surface">
            {organization.members.map((member) => (
              <div key={member.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-surface-muted/50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-xs uppercase">
                    {member.user.name ? member.user.name.slice(0, 2) : member.user.email.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-ink">
                      {member.user.name || (isRTL ? "مستخدم بدون اسم" : "User")}
                    </p>
                    <p className="text-ink-soft font-mono text-[11px]">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      member.role === Role.OWNER
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : member.role === Role.ADMIN
                        ? "bg-brand-50 text-brand-700 border-brand-200"
                        : "bg-surface-muted text-ink-soft border-line"
                    }`}
                  >
                    {roleLabel(member.role)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
