import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface DamageFlashProps {
  /** Which side to flash - "left" for team 1, "right" for team 2 */
  side: "left" | "right";
  /** Points dealt as damage */
  damage: number;
  /** Name of the player/asset that scored */
  playerName: string;
  /** Type of asset for color theming */
  playerType?: "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";
  /** Image URL for the asset (optional) */
  imageUrl?: string | null;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Whether the flash is active */
  isActive: boolean;
}

const PLAYER_TYPE_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  manufacturer: { bg: "from-orange-500/30", text: "text-orange-400", glow: "shadow-orange-500/50" },
  cannabis_strain: { bg: "from-green-500/30", text: "text-green-400", glow: "shadow-green-500/50" },
  product: { bg: "from-purple-500/30", text: "text-purple-400", glow: "shadow-purple-500/50" },
  pharmacy: { bg: "from-blue-500/30", text: "text-blue-400", glow: "shadow-blue-500/50" },
  brand: { bg: "from-pink-500/30", text: "text-pink-400", glow: "shadow-pink-500/50" },
};

/**
 * DamageFlash Component
 * 
 * Displays a dramatic damage flash effect on one side of the battle arena
 * with floating damage numbers and player name.
 */
export function DamageFlash({
  side,
  damage,
  playerName,
  playerType = "manufacturer",
  imageUrl,
  onComplete,
  isActive,
}: DamageFlashProps) {
  const [phase, setPhase] = useState<"idle" | "flash" | "number" | "fade">("idle");
  const [showNumber, setShowNumber] = useState(false);

  const colors = PLAYER_TYPE_COLORS[playerType] || PLAYER_TYPE_COLORS.manufacturer;

  useEffect(() => {
    if (!isActive) {
      setPhase("idle");
      setShowNumber(false);
      return;
    }

    // Animation sequence
    setPhase("flash");
    
    const flashTimer = setTimeout(() => {
      setPhase("number");
      setShowNumber(true);
    }, 150);

    const fadeTimer = setTimeout(() => {
      setPhase("fade");
    }, 1800);

    const completeTimer = setTimeout(() => {
      setPhase("idle");
      setShowNumber(false);
      onComplete?.();
    }, 2500);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete]);

  if (phase === "idle") return null;

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-50 overflow-hidden",
        side === "left" ? "right-1/2" : "left-1/2"
      )}
    >
      {/* Flash overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-150",
          side === "left"
            ? `bg-gradient-to-r ${colors.bg} to-transparent`
            : `bg-gradient-to-l ${colors.bg} to-transparent`,
          phase === "flash" ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Screen shake effect via CSS animation */}
      <div
        className={cn(
          "absolute inset-0",
          phase === "flash" && "animate-screen-shake"
        )}
      />

      {/* Damage number and player name */}
      {showNumber && (
        <div
          className={cn(
            "absolute flex flex-col items-center gap-1",
            side === "left" ? "right-8 sm:right-12" : "left-8 sm:left-12",
            "top-1/2 -translate-y-1/2",
            phase === "fade" ? "animate-damage-fade-out" : "animate-damage-pop-in"
          )}
        >
          {/* Asset image (if available) */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={playerName}
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 object-cover",
                "shadow-lg",
                colors.glow
              )}
            />
          )}

          {/* Damage number */}
          <div
            className={cn(
              "text-4xl sm:text-5xl font-black tabular-nums",
              colors.text,
              "drop-shadow-[0_0_10px_currentColor]",
              "animate-pulse"
            )}
          >
            -{damage.toFixed(1)}
          </div>

          {/* Player name */}
          <div
            className={cn(
              "text-xs sm:text-sm font-bold uppercase tracking-wider",
              "text-white/90 bg-black/60 px-2 py-0.5 rounded-full",
              "max-w-[120px] sm:max-w-[160px] truncate"
            )}
          >
            {playerName}
          </div>

          {/* Impact particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  colors.text.replace("text-", "bg-"),
                  "animate-damage-particle"
                )}
                style={{
                  left: "50%",
                  top: "50%",
                  animationDelay: `${i * 50}ms`,
                  "--particle-angle": `${i * 60}deg`,
                  "--particle-distance": `${40 + Math.random() * 30}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DamageFlash;

