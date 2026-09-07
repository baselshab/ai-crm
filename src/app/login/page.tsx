"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { UnderlineInput } from "@/components/auth/UnderlineInput";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useTranslation } from "@/i18n/LanguageContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const registered = searchParams.get("registered");
  const { tr } = useTranslation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (registered) {
      setSuccessMsg(tr.auth.successRegistered);
    }
  }, [registered, tr.auth.successRegistered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (res?.error) {
        setError(tr.auth.invalidCredentials);
      } else if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError(tr.auth.authError);
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

      <AuthCard title={tr.auth.loginTitle}>
        {successMsg && (
          <div className="p-3 text-xs rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-center font-medium mb-5">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-center font-medium mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <UnderlineInput
            id="login-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            label={tr.auth.emailLabel}
            placeholder="name@company.com"
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

          <UnderlineInput
            id="login-password"
            name="password"
            required
            autoComplete="current-password"
            label={tr.auth.passwordLabel}
            placeholder="password"
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-[10px] bg-[#1d5bfe] hover:bg-[#154ed8] active:bg-[#1040b8] text-white font-medium text-[15px] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{tr.auth.loggingIn}</span>
                </div>
              ) : (
                tr.auth.loginButton
              )}
            </button>
          </div>

          {/* Quick Demo Credentials Helper */}
          <div className="pt-1">
            <button
              type="button"
              id="fill-demo-credentials"
              onClick={() => {
                setFormData({
                  email: "demo@example.com",
                  password: "Demo1234!",
                });
                setError(null);
              }}
              className="w-full py-2.5 px-4 rounded-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#1e293b] font-medium text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{tr.auth.demoButton}</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <Link
              href="/register"
              className="text-[14px] text-[#1d5bfe] hover:underline font-normal transition-colors"
            >
              {tr.auth.orSignUp}
            </Link>
          </div>

          <div className="text-center pt-4">
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert(tr.auth.forgotPasswordAlert);
              }}
              className="text-[13px] text-[#9ca3af] hover:text-[#64748b] transition-colors"
            >
              {tr.auth.forgotPassword}
            </Link>
          </div>
        </form>
      </AuthCard>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1d5bfe]/20 border-t-[#1d5bfe] rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
