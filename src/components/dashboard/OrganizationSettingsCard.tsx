"use client";

import { useState, useTransition } from "react";
import { Role } from "@/generated/prisma/enums";
import {
  updateOrganizationName,
  addMemberToOrganization,
  type OrganizationDetails,
} from "@/lib/actions/organization";

interface Props {
  organization: OrganizationDetails;
  currentRole: Role;
}

export function OrganizationSettingsCard({ organization, currentRole }: Props) {
  const [orgName, setOrgName] = useState(organization.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [namePending, startNameTransition] = useTransition();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.MEMBER);
  const [invitePending, startInviteTransition] = useTransition();

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = currentRole === Role.OWNER || currentRole === Role.ADMIN;

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startNameTransition(async () => {
      const res = await updateOrganizationName(orgName);
      if (res.success) {
        setIsEditingName(false);
        setMessage({ type: "success", text: "تم تحديث اسم المؤسسة بنجاح." });
      } else {
        setMessage({ type: "error", text: res.error || "فشل التحديث" });
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
        setMessage({ type: "success", text: res.message || "تمت إضافة العضو بنجاح." });
      } else {
        setMessage({ type: "error", text: res.error || "فشل إضافة العضو." });
      }
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">إدارة المؤسسة وفريق العمل</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Multi-Tenant Scope
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            بيانات المنظمة وفريق العمل معزولة تماماً بمعرف المؤسسة (Tenant ID: <code className="text-indigo-300 font-mono">{organization.id}</code>)
          </p>
        </div>

        {/* Name Edit / View */}
        {canEdit && !isEditingName ? (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            تعديل اسم المنظمة ✏️
          </button>
        ) : null}
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
              : "bg-red-950/40 border border-red-500/30 text-red-300"
          }`}
        >
          <span>{message.type === "success" ? "✓" : "⚠"}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Edit Organization Name Form */}
      {isEditingName && (
        <form onSubmit={handleUpdateName} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <label className="text-xs text-slate-300 font-semibold block">تغيير اسم المؤسسة</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={namePending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition"
            >
              {namePending ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditingName(false);
                setOrgName(organization.name);
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Add Member Form (For OWNER & ADMIN) */}
      {canEdit && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">إضافة عضو إلى فريق العمل</h3>
          <p className="text-xs text-slate-400">
            أدخل البريد الإلكتروني لمستخدم مسجل لمنحه وصولاً إلى هذه المؤسسة بصلاحية محددة.
          </p>

          <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="sm:col-span-7 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="sm:col-span-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={Role.MEMBER}>عضو (MEMBER)</option>
              <option value={Role.ADMIN}>مشرف (ADMIN)</option>
            </select>

            <button
              type="submit"
              disabled={invitePending}
              className="sm:col-span-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition"
            >
              {invitePending ? "إضافة..." : "إضافة +"}
            </button>
          </form>
        </div>
      )}

      {/* Team Members List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
          <span>أعضاء الفريق ({organization.members.length})</span>
          <span className="text-xs font-normal text-slate-400">دورك الحالي: <strong className="text-indigo-400">{currentRole}</strong></span>
        </h3>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          {organization.members.map((member) => (
            <div key={member.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs uppercase">
                  {member.user.name ? member.user.name.slice(0, 2) : member.user.email.slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{member.user.name || "مستخدم بدون اسم"}</p>
                  <p className="text-slate-500 font-mono text-[11px]">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                    member.role === Role.OWNER
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : member.role === Role.ADMIN
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                      : "bg-slate-700/30 text-slate-300 border-slate-600/30"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
