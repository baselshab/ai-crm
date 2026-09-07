import React from "react";
import Image from "next/image";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="relative z-10 w-full max-w-[420px] bg-white rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.06),0_2px_12px_rgba(0,0,0,0.02)] px-8 py-11 sm:px-11 sm:py-12 border border-slate-100/80 transition-all">
      {/* Brand Icon: Sanad Logo Mark */}
      <div className="flex justify-center mb-5">
        <Image
          src="/brand/sanad-mark.svg"
          alt="سند | SANAD"
          width={52}
          height={52}
          className="h-13 w-13 transition-transform hover:scale-105 duration-200"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-[28px] font-bold text-[#111827] text-center tracking-tight mb-7">
        {title}
      </h1>

      {subtitle && (
        <p className="text-xs text-[#64748b] text-center -mt-5 mb-6">
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
}
