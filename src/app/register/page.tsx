"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { UnderlineInput } from "@/components/auth/UnderlineInput";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useTranslation } from "@/i18n/LanguageContext";

export default function RegisterPage() {
  const router = useRouter();
  const { tr } = useTranslation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Send registration request
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || tr.auth.authError);
      }

      // 2. Auto sign-in after successful registration
      const signInRes = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push("/login?registered=true");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(tr.auth.authError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center bg-[#f8fafc] px-4 py-8 font-sans selection:bg-[#1d5bfe] selection:text-white">
      {/* Visual background matching reference image */}
      <AuthBackground />

      {/* Language Switcher on Auth page */}
      <div className="absolute top-5 end-5 z-20">
        <LanguageToggle variant="pill" />
      </div>

      <AuthCard title={tr.auth.registerTitle}>
        {error && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-center font-medium mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <UnderlineInput
            id="register-name"
            name="name"
            required
            autoComplete="name"
            label={tr.auth.nameLabel}
            placeholder={tr.auth.nameLabel}
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
          />

          {/* Email */}
          <UnderlineInput
            id="register-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            label={tr.auth.emailLabel}
            placeholder="Work Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            }
          />

          {/* Password */}
          <UnderlineInput
            id="register-password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            label={tr.auth.passwordLabel}
            placeholder="Password (min 6 characters)"
            isPassword={true}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
          />

          {/* Organization / Company Name (Optional) */}
          <UnderlineInput
            id="register-company"
            name="companyName"
            autoComplete="organization"
            label={tr.auth.companyNameLabel}
            placeholder={tr.auth.companyNameLabel}
            value={formData.companyName}
            onChange={(e) =>
              setFormData({ ...formData, companyName: e.target.value })
            }
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            }
          />

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-[10px] bg-[#1d5bfe] hover:bg-[#154ed8] active:bg-[#1040b8] text-white font-medium text-[15px] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{tr.auth.creatingAccount}</span>
                </div>
              ) : (
                tr.auth.registerButton
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-[14px] text-[#1d5bfe] hover:underline font-normal transition-colors"
            >
              {tr.auth.orLogin}
            </Link>
          </div>
        </form>
      </AuthCard>
    </main>
  );
}
