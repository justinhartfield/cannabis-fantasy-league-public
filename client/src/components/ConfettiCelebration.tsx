import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * ConfettiCelebration Component
 * 
 * A pure CSS confetti burst animation for celebrations.
 * No external dependencies required.
 */

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

interface ConfettiCelebrationProps {
  isActive: boolean;
  onComplete?: () => void;
  pieceCount?: number;
  duration?: number;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = [
  "#cfff4d", // Weed green
  "#ff5c47", // Coral
  "#a3ff12", // Bright green
  "#ff69b4", // Pink
  "#ffd700", // Gold
  "#00d4aa", // Teal
  "#ff744d", // Orange
  "#ffffff", // White
];

export function ConfettiCelebration({
  isActive,
  onComplete,
  pieceCount = 50,
  duration = 3000,
  colors = DEFAULT_COLORS,
  className,
}: ConfettiCelebrationProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // Percentage across screen
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5, // Stagger start
        duration: 2 + Math.random() * 2, // Varying fall speeds
        size: 6 + Math.random() * 8, // Varying sizes
        rotation: Math.random() * 360,
      }));

      setPieces(newPieces);
      setIsVisible(true);

      // Clean up after animation
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [isActive, pieceCount, duration, colors, onComplete]);

  if (!isVisible || pieces.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none z-50 overflow-hidden",
        className
      )}
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute confetti-piece"
          style={{
            left: `${piece.x}%`,
            top: "-20px",
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${piece.rotation}deg)`,
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
            boxShadow: `0 0 ${piece.size / 2}px ${piece.color}40`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Hook to trigger confetti celebrations
 */
export function useConfetti() {
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState<Partial<ConfettiCelebrationProps>>({});

  const trigger = useCallback((options: Partial<ConfettiCelebrationProps> = {}) => {
    setConfig(options);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    config,
    trigger,
    stop,
    ConfettiComponent: (
      <ConfettiCelebration
        isActive={isActive}
        onComplete={stop}
        {...config}
      />
    ),
  };
}

/**
 * Preset confetti configurations
 */
export const CONFETTI_PRESETS = {
  /** Standard celebration */
  standard: {
    pieceCount: 50,
    duration: 3000,
  },
  /** Big win celebration */
  bigWin: {
    pieceCount: 100,
    duration: 4000,
    colors: ["#ffd700", "#ff5c47", "#cfff4d", "#ffffff"],
  },
  /** Streak celebration - fire colors */
  streak: {
    pieceCount: 60,
    duration: 3500,
    colors: ["#ff6b35", "#ff5c47", "#ffcc00", "#ffd700", "#ff744d"],
  },
  /** Rank #1 celebration */
  champion: {
    pieceCount: 80,
    duration: 4000,
    colors: ["#ffd700", "#ffffff", "#cfff4d", "#a3ff12"],
  },
} as const;

export default ConfettiCelebration;

