"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
  className?: string;
}

const COLORS = [
  "#10B981", // green
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export function Confetti({
  active,
  duration = 3000,
  particleCount = 50,
  className
}: ConfettiProps) {
  const [pieces, setPieces] = React.useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        size: 6 + Math.random() * 8,
      }));
      setPieces(newPieces);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration, particleCount]);

  if (!isVisible) return null;

  return (
    <div className={cn("fixed inset-0 pointer-events-none z-50 overflow-hidden", className)}>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: "-20px",
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Celebration modal/overlay for challenge completion
interface CelebrationModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: React.ReactNode;
}

export function CelebrationModal({
  open,
  onClose,
  title,
  message,
  icon
}: CelebrationModalProps) {
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <Confetti active={open} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-background border rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-w-md mx-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 animate-bounce">
            {icon || (
              <div className="text-6xl">🎉</div>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          {message && (
            <p className="text-muted-foreground">{message}</p>
          )}
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Awesome!
          </button>
        </div>
      </div>
    </>
  );
}

// Small inline celebration burst (for smaller UI elements)
interface CelebrationBurstProps {
  active: boolean;
  className?: string;
}

export function CelebrationBurst({ active, className }: CelebrationBurstProps) {
  const [particles, setParticles] = React.useState<Array<{ id: number; angle: number; color: string }>>([]);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i / 12) * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
      setParticles(newParticles);
      setIsVisible(true);

      const timer = setTimeout(() => setIsVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!isVisible) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-burst"
          style={{
            backgroundColor: particle.color,
            transform: `rotate(${particle.angle}deg) translateY(-20px)`,
            animationDelay: `${particle.id * 0.02}s`,
          }}
        />
      ))}
    </div>
  );
}
