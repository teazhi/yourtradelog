"use client";

import * as React from "react";
import { cn } from "@/components/ui";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  showText?: boolean;
}

const sizes = {
  sm: { icon: 24, text: "text-base" },
  md: { icon: 32, text: "text-lg" },
  lg: { icon: 40, text: "text-xl" },
  xl: { icon: 48, text: "text-2xl" },
};

export function Logo({ className, size = "md", variant = "full", showText = true }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Hexagon background */}
        <path
          d="M24 2L44 14V34L24 46L4 34V14L24 2Z"
          fill="url(#logoGradientHex)"
        />

        {/* Upward arrow/growth symbol */}
        <path
          d="M24 14L24 34"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M16 22L24 14L32 22"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <defs>
          <linearGradient id="logoGradientHex" x1="4" y1="46" x2="44" y2="2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>

      {/* Logo Text */}
      {variant === "full" && showText && (
        <span className={cn("font-bold tracking-tight", textSize)}>
          <span className="text-foreground">Your</span>
          <span className="text-green-500">Trade</span>
          <span className="text-foreground">Log</span>
        </span>
      )}
    </div>
  );
}

// Export a simple icon-only version for smaller uses
export function LogoIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M24 2L44 14V34L24 46L4 34V14L24 2Z"
        fill="url(#logoGradientHexIcon)"
      />
      <path
        d="M24 14L24 34"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M16 22L24 14L32 22"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="logoGradientHexIcon" x1="4" y1="46" x2="44" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
    </svg>
  );
}
