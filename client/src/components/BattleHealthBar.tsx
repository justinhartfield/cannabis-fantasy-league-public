import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

export interface BattleHealthBarProps {
  /** Team name */
  teamName: string;
  /** Current score */
  score: number;
  /** Opponent's current score */
  opponentScore: number;
  /** Maximum expected score for scaling (default: 200) */
  maxScore?: number;
  /** Which side of the arena */
  side: "left" | "right";
  /** Whether this team just got hit */
  isHit?: boolean;
  /** Callback when hit animation completes */
  onHitComplete?: () => void;
}

/**
 * BattleHealthBar Component
 * 
 * Displays a fighting game-style health bar that:
 * - Shows relative health based on score difference
 * - Animates depletion when taking damage
 * - Shakes and glows when hit
 * - Turns red and pulses when critically low
 */
export function BattleHealthBar({
  teamName,
  score,
  opponentScore,
  maxScore = 200,
  side,
  isHit = false,
  onHitComplete,
}: BattleHealthBarProps) {
  const [displayHealth, setDisplayHealth] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHitEffect, setShowHitEffect] = useState(false);
  const prevHealthRef = useRef(100);

  // Calculate health percentage based on score difference
  // Health goes down when opponent is ahead, up when we're ahead
  const scoreDiff = score - opponentScore;
  const healthPercent = Math.max(10, Math.min(100, 50 + (scoreDiff / maxScore) * 100));
  
  const isCritical = healthPercent <= 25;
  const isLow = healthPercent <= 40;

  useEffect(() => {
    const prevHealth = prevHealthRef.current;
    
    if (healthPercent !== prevHealth) {
      setIsAnimating(true);
      
      // Animate health bar
      const duration = 600;
      const startTime = performance.now();
      const startHealth = displayHealth;
      const healthChange = healthPercent - startHealth;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setDisplayHealth(startHealth + healthChange * easeOut);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayHealth(healthPercent);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
      prevHealthRef.current = healthPercent;
    }
  }, [healthPercent, displayHealth]);

  // Handle hit effect
  useEffect(() => {
    if (isHit) {
      setShowHitEffect(true);
      const timer = setTimeout(() => {
        setShowHitEffect(false);
        onHitComplete?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isHit, onHitComplete]);

  return (
    <div
      className={cn(
        "relative w-full",
        side === "right" && "flex flex-col items-end"
      )}
    >
      {/* Team name label */}
      <div
        className={cn(
          "text-xs font-bold uppercase tracking-wider mb-1",
          isCritical ? "text-red-400" : isLow ? "text-yellow-400" : "text-white/70"
        )}
      >
        {teamName}
      </div>

      {/* Health bar container */}
      <div
        className={cn(
          "relative h-4 w-full max-w-[200px] rounded-full overflow-hidden",
          "bg-black/50 border border-white/20",
          showHitEffect && "animate-health-shake",
          isCritical && "animate-health-critical"
        )}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

        {/* Health fill */}
        <div
          className={cn(
            "absolute top-0 h-full transition-all duration-100",
            side === "left" ? "left-0 rounded-r-full" : "right-0 rounded-l-full",
            isCritical
              ? "bg-gradient-to-r from-red-600 to-red-400"
              : isLow
              ? "bg-gradient-to-r from-yellow-600 to-yellow-400"
              : side === "left"
              ? "bg-gradient-to-r from-primary to-primary/80"
              : "bg-gradient-to-r from-secondary/80 to-secondary"
          )}
          style={{
            width: `${displayHealth}%`,
            boxShadow: isCritical
              ? "0 0 10px rgba(239, 68, 68, 0.5)"
              : isLow
              ? "0 0 10px rgba(234, 179, 8, 0.5)"
              : side === "left"
              ? "0 0 10px rgba(163, 255, 18, 0.3)"
              : "0 0 10px rgba(255, 92, 71, 0.3)",
          }}
        >
          {/* Inner highlight */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full" />
        </div>

        {/* Hit flash overlay */}
        {showHitEffect && (
          <div className="absolute inset-0 bg-white animate-impact-flash" />
        )}

        {/* Damage chunk indicator (red overlay showing damage taken) */}
        {isAnimating && displayHealth < prevHealthRef.current && (
          <div
            className={cn(
              "absolute top-0 h-full bg-red-500/60",
              side === "left" ? "right-0" : "left-0"
            )}
            style={{
              width: `${prevHealthRef.current - displayHealth}%`,
            }}
          />
        )}
      </div>

      {/* Health percentage */}
      <div
        className={cn(
          "text-[10px] font-mono mt-0.5",
          isCritical ? "text-red-400" : isLow ? "text-yellow-400" : "text-white/50"
        )}
      >
        {Math.round(displayHealth)}%
      </div>

      {/* Critical warning */}
      {isCritical && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-red-500 text-xs font-bold animate-pulse">
          DANGER!
        </div>
      )}
    </div>
  );
}

export default BattleHealthBar;

