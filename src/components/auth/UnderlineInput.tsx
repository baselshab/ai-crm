"use client";

import React, { useState } from "react";

interface UnderlineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  isPassword?: boolean;
  label?: string;
}

export function UnderlineInput({
  icon,
  isPassword = false,
  className = "",
  value,
  label,
  id,
  ...props
}: UnderlineInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const isActive = isFocused || hasValue;

  const inputType = isPassword ? (showPassword ? "text" : "password") : props.type || "text";

  return (
    <div className="relative group w-full">
      {label && (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {/* Left Icon */}
        <div
          className={`flex items-center justify-center transition-colors duration-200 me-3.5 select-none ${
            isActive ? "text-[#1d5bfe]" : "text-[#9ca3af]"
          }`}
        >
          {icon}
        </div>

        {/* Input */}
        <input
          id={id}
          value={value}
          type={inputType}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`w-full bg-transparent py-2.5 text-[15px] text-[#1e293b] placeholder:text-[#9ca3af] placeholder:font-normal focus:outline-none transition-colors ${className}`}
          {...props}
        />

        {/* Password Visibility Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[#9ca3af] hover:text-[#475569] p-1 ms-1 transition-colors focus:outline-none focus:text-[#1d5bfe] cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Underline Base */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#e2e8f0]" />

      {/* Active Animated Underline */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1d5bfe] transition-all duration-300 ease-out ltr:origin-left rtl:origin-right ${
          isFocused ? "scale-x-100 opacity-100" : hasValue ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
        }`}
      />
    </div>
  );
}
