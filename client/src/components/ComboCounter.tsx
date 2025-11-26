import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ComboCounterProps {
  /** Current combo count */
  count: number;
  /** Which team has the combo */
  teamSide: "left" | "right" | null;
  /** Team color */
  teamColor?: string;
  /** Whether a new hit was just registered */
  isNewHit?: boolean;
}

const COMBO_THRESHOLDS = [
  { min: 10, label: "UNSTOPPABLE!", className: "animate-super-combo text-6xl" },
  { min: 7, label: "SUPER COMBO!", className: "animate-combo-pulse text-5xl text-yellow-400" },
  { min: 5, label: "MEGA HIT!", className: "animate-combo-pulse text-4xl text-orange-400" },
  { min: 3, label: "COMBO!", className: "text-3xl text-primary" },
  { min: 2, label: "HIT!", className: "text-2xl text-white" },
];

function getComboConfig(count: number) {
  return COMBO_THRESHOLDS.find((t) => count >= t.min) || null;
}

/**
 * ComboCounter Component
 * 
 * Displays an arcade-style combo counter with:
 * - Escalating text based on combo length
 * - Pop animation on each hit
 * - Rainbow effect for super combos
 * - Auto-reset after timeout
 */
export function ComboCounter({
  count,
  teamSide,
  teamColor,
  isNewHit = false,
}: ComboCounterProps) {
  const [showCounter, setShowCounter] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const config = getComboConfig(count);
  const isSuper = count >= 7;

  useEffect(() => {
    if (count >= 2 && teamSide) {
      setShowCounter(true);
      setDisplayCount(count);
      
      // Trigger animation
      if (isNewHit) {
        setAnimationKey((k) => k + 1);
      }

      // Reset timeout for hiding
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Hide after 5 seconds of no activity
      timeoutRef.current = setTimeout(() => {
        setShowCounter(false);
      }, 5000);
    } else {
      setShowCounter(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [count, teamSide, isNewHit]);

  if (!showCounter || !config || !teamSide) return null;

  return (
    <div
      className={cn(
        "absolute z-50 flex flex-col items-center pointer-events-none",
        teamSide === "left" ? "left-4 sm:left-8" : "right-4 sm:right-8",
        "top-1/2 -translate-y-1/2"
      )}
    >
      {/* Combo count number */}
      <div
        key={`count-${animationKey}`}
        className={cn(
          "font-black tabular-nums",
          config.className,
          "animate-combo-pop"
        )}
        style={{
          textShadow: isSuper
            ? "0 0 30px currentColor, 0 0 60px currentColor"
            : "0 0 20px currentColor",
          color: isSuper ? undefined : teamColor,
        }}
      >
        {displayCount}
      </div>

      {/* Combo label */}
      <div
        key={`label-${animationKey}`}
        className={cn(
          "font-black uppercase tracking-widest animate-combo-pop",
          isSuper ? "text-xl" : "text-sm",
          isSuper && "animate-super-combo"
        )}
        style={{
          animationDelay: "0.1s",
          textShadow: "0 0 10px currentColor",
          color: isSuper ? undefined : teamColor,
        }}
      >
        {config.label}
      </div>

      {/* Hit streak visualization */}
      <div className="flex gap-1 mt-2">
        {[...Array(Math.min(displayCount, 10))].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full",
              i < displayCount - 1 ? "opacity-40" : "opacity-100"
            )}
            style={{
              backgroundColor: teamColor || (teamSide === "left" ? "#A3FF12" : "#FF5C47"),
              boxShadow: i === displayCount - 1 ? `0 0 8px ${teamColor || "#fff"}` : undefined,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>

      {/* Particle burst for super combos */}
      {isSuper && isNewHit && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full"
              style={{
                background: `linear-gradient(45deg, ${teamColor || "#fff"}, gold)`,
                animation: "damage-particle 0.8s ease-out forwards",
                animationDelay: `${i * 50}ms`,
                "--particle-angle": `${i * 45}deg`,
                "--particle-distance": "80px",
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}

