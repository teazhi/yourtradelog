"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/components/ui";

interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function CustomDialog({ open, onOpenChange, children }: CustomDialogProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80" />
      {/* Content */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={() => onOpenChange(false)}
      >
        <div
          className="relative bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

interface CustomDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CustomDialogHeader({ children, className }: CustomDialogHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)}>
      {children}
    </div>
  );
}

interface CustomDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CustomDialogTitle({ children, className }: CustomDialogTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  );
}

interface CustomDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CustomDialogDescription({ children, className }: CustomDialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

interface CustomDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CustomDialogContent({ children, className }: CustomDialogContentProps) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}

interface CustomDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CustomDialogFooter({ children, className }: CustomDialogFooterProps) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0", className)}>
      {children}
    </div>
  );
}
