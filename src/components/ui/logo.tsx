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
      {/* Logo Icon - Modern abstract chart/growth symbol */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background rounded square */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          fill="url(#logoGradient)"
        />

        {/* Abstract rising chart lines */}
        <path
          d="M12 32L18 26L24 30L36 16"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Arrow head at the end */}
        <path
          d="M30 16H36V22"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Small dot at start */}
        <circle cx="12" cy="32" r="2.5" fill="white" />

        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22c55e" />
            <stop offset="1" stopColor="#059669" />
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

// Alternative logo designs for variety
export function LogoAlt1({ className, size = "md", variant = "full", showText = true }: LogoProps) {
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
        {/* Circular background */}
        <circle cx="24" cy="24" r="22" fill="url(#logoGradientAlt1)" />

        {/* Stylized "Y" made of chart bars */}
        <rect x="14" y="28" width="5" height="8" rx="1" fill="white" />
        <rect x="21.5" y="20" width="5" height="16" rx="1" fill="white" />
        <rect x="29" y="12" width="5" height="24" rx="1" fill="white" />

        <defs>
          <linearGradient id="logoGradientAlt1" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>

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

export function LogoAlt2({ className, size = "md", variant = "full", showText = true }: LogoProps) {
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
          fill="url(#logoGradientAlt2)"
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
          <linearGradient id="logoGradientAlt2" x1="4" y1="46" x2="44" y2="2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>

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

// Minimal line-based logo
export function LogoMinimal({ className, size = "md", variant = "full", showText = true }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Rounded square outline */}
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          rx="10"
          stroke="url(#logoGradientMin)"
          strokeWidth="3"
          fill="none"
        />

        {/* Rising line chart */}
        <path
          d="M12 32L20 24L28 28L36 16"
          stroke="url(#logoGradientMin)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dot at peak */}
        <circle cx="36" cy="16" r="3" fill="#22c55e" />

        <defs>
          <linearGradient id="logoGradientMin" x1="4" y1="44" x2="44" y2="4" gradientUnits="userSpaceOnUse">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>

      {variant === "full" && showText && (
        <span className={cn("font-semibold tracking-tight", textSize)}>
          <span className="text-foreground">Your</span>
          <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">Trade</span>
          <span className="text-foreground">Log</span>
        </span>
      )}
    </div>
  );
}
