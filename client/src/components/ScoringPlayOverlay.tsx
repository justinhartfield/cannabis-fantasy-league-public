import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScoringPlayData {
  attackingTeamId: number;
  attackingTeamName: string;
  defendingTeamId: number;
  defendingTeamName: string;
  playerName: string;
  playerType: "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";
  pointsScored: number;
  attackerNewTotal: number;
  defenderTotal: number;
  imageUrl?: string | null;
  position?: string;
}

export interface ScoringPlayOverlayProps {
  /** The scoring play to display */
  play: ScoringPlayData | null;
  /** Which team is on the left side */
  leftTeamId: number;
  /** Which team is on the right side */
  rightTeamId: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

const PLAYER_TYPE_COLORS: Record<string, string> = {
  manufacturer: "#f97316", // orange
  cannabis_strain: "#22c55e", // green
  product: "#a855f7", // purple
  pharmacy: "#3b82f6", // blue
  brand: "#ec4899", // pink
};

/**
 * ScoringPlayOverlay Component
 * 
 * Displays attack effects when a scoring play happens:
 * - Slash marks across the defender
 * - Energy blast from the attacker
 * - Impact particles
 * - Fighter lunge animation trigger
 */
export function ScoringPlayOverlay({
  play,
  leftTeamId,
  rightTeamId,
  onComplete,
}: ScoringPlayOverlayProps) {
  const [phase, setPhase] = useState<"idle" | "lunge" | "impact" | "slash" | "complete">("idle");
  const [slashMarks, setSlashMarks] = useState<Array<{ id: number; angle: number; delay: number }>>([]);

  // Determine attack direction
  const attackerIsLeft = play?.attackingTeamId === leftTeamId;
  const color = play ? PLAYER_TYPE_COLORS[play.playerType] || PLAYER_TYPE_COLORS.manufacturer : "#fff";
  const isBigHit = (play?.pointsScored ?? 0) >= 10;

  useEffect(() => {
    if (!play) {
      setPhase("idle");
      setSlashMarks([]);
      return;
    }

    // Generate random slash marks
    const numSlashes = isBigHit ? 4 : 2;
    const marks = Array.from({ length: numSlashes }, (_, i) => ({
      id: i,
      angle: -45 + (Math.random() * 30 - 15),
      delay: i * 80,
    }));
    setSlashMarks(marks);

    // Animation sequence
    setPhase("lunge");

    const impactTimer = setTimeout(() => setPhase("impact"), 200);
    const slashTimer = setTimeout(() => setPhase("slash"), 300);
    const completeTimer = setTimeout(() => {
      setPhase("complete");
      onComplete?.();
    }, 1200);

    return () => {
      clearTimeout(impactTimer);
      clearTimeout(slashTimer);
      clearTimeout(completeTimer);
    };
  }, [play, onComplete, isBigHit]);

  if (phase === "idle" || !play) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Energy blast from attacker */}
      {(phase === "impact" || phase === "slash") && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2",
            attackerIsLeft ? "left-1/4" : "right-1/4"
          )}
        >
          {/* Radial energy burst */}
          <div
            className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 animate-energy-blast"
            style={{
              background: `radial-gradient(circle, ${color}80 0%, ${color}40 40%, transparent 70%)`,
            }}
          />
          
          {/* Energy ring */}
          <div
            className="absolute w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 animate-energy-blast"
            style={{
              borderColor: color,
              animationDelay: "0.1s",
            }}
          />
        </div>
      )}

      {/* Slash marks on defender side */}
      {phase === "slash" && slashMarks.map((mark) => (
        <div
          key={mark.id}
          className={cn(
            "absolute top-1/2",
            attackerIsLeft ? "right-1/4" : "left-1/4"
          )}
          style={{
            transform: `translateY(-50%) rotate(${mark.angle}deg)`,
            animationDelay: `${mark.delay}ms`,
          }}
        >
          {/* Slash line */}
          <div
            className="w-40 h-2 origin-left animate-slash-mark"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, white, ${color}, transparent)`,
              boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
            }}
          />
        </div>
      ))}

      {/* Impact sparks */}
      {(phase === "impact" || phase === "slash") && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2",
            attackerIsLeft ? "right-1/3" : "left-1/3"
          )}
        >
          {[...Array(isBigHit ? 12 : 6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
                animation: "damage-particle 0.5s ease-out forwards",
                animationDelay: `${i * 30}ms`,
                "--particle-angle": `${i * (360 / (isBigHit ? 12 : 6))}deg`,
                "--particle-distance": `${60 + Math.random() * 40}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Big hit screen flash */}
      {isBigHit && phase === "impact" && (
        <div
          className="absolute inset-0 animate-impact-flash"
          style={{
            backgroundColor: `${color}30`,
          }}
        />
      )}

      {/* Player name and points indicator */}
      {phase === "slash" && (
        <div
          className={cn(
            "absolute top-1/3 flex flex-col items-center gap-1",
            attackerIsLeft ? "left-1/4 -translate-x-1/2" : "right-1/4 translate-x-1/2"
          )}
        >
          {/* Points badge */}
          <div
            className="px-3 py-1 rounded-full text-white font-black text-lg animate-combo-pop"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 20px ${color}`,
            }}
          >
            +{play.pointsScored.toFixed(1)}
          </div>
          
          {/* Player name */}
          <div className="text-xs font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-full max-w-[120px] truncate animate-fade-in">
            {play.playerName}
          </div>
        </div>
      )}
    </div>
  );
}

