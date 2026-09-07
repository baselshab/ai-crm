import React from "react";
import { cn, initials } from "@/lib/utils";

const palette = [
  "bg-brand-100 text-brand-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function colorFor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name = "", src, size = "md", className }: AvatarProps) {
  const safeName = name || "";
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold overflow-hidden shrink-0 select-none",
        sizes[size],
        !src && colorFor(safeName),
        className
      )}
      title={safeName}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={safeName} className="h-full w-full object-cover" />
      ) : (
        initials(safeName) || "?"
      )}
    </div>
  );
}
