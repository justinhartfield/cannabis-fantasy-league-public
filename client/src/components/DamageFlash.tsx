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

const PLAYER_TYPE_COLORS: Record<string, { bg: string; text: string; glow: string; hex: string }> = {
  manufacturer: { bg: "from-orange-500/40", text: "text-orange-400", glow: "shadow-orange-500/50", hex: "#f97316" },
  cannabis_strain: { bg: "from-green-500/40", text: "text-green-400", glow: "shadow-green-500/50", hex: "#22c55e" },
  product: { bg: "from-purple-500/40", text: "text-purple-400", glow: "shadow-purple-500/50", hex: "#a855f7" },
  pharmacy: { bg: "from-blue-500/40", text: "text-blue-400", glow: "shadow-blue-500/50", hex: "#3b82f6" },
  brand: { bg: "from-pink-500/40", text: "text-pink-400", glow: "shadow-pink-500/50", hex: "#ec4899" },
};

/**
 * DamageFlash Component
 * 
 * Displays an EPIC damage flash effect on one side of the battle arena
 * with massive floating damage numbers, critical hit indicators, and dramatic effects.
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
  const [phase, setPhase] = useState<"idle" | "flash" | "number" | "sustain" | "fade">("idle");
  const [showNumber, setShowNumber] = useState(false);
  const [showCritical, setShowCritical] = useState(false);

  const colors = PLAYER_TYPE_COLORS[playerType] || PLAYER_TYPE_COLORS.manufacturer;
  const isBigHit = damage >= 10;
  const isCriticalHit = damage >= 20;

  useEffect(() => {
    if (!isActive) {
      setPhase("idle");
      setShowNumber(false);
      setShowCritical(false);
      return;
    }

    // Animation sequence - extended for epic effect (4 seconds total)
    setPhase("flash");
    
    const flashTimer = setTimeout(() => {
      setPhase("number");
      setShowNumber(true);
      if (isCriticalHit) {
        setShowCritical(true);
      }
    }, 200);

    const sustainTimer = setTimeout(() => {
      setPhase("sustain");
    }, 1500);

    const fadeTimer = setTimeout(() => {
      setPhase("fade");
    }, 3000);

    const completeTimer = setTimeout(() => {
      setPhase("idle");
      setShowNumber(false);
      setShowCritical(false);
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(sustainTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete, isCriticalHit]);

  if (phase === "idle") return null;

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-50 overflow-hidden",
        side === "left" ? "right-1/2" : "left-1/2"
      )}
    >
      {/* EPIC Flash overlay - larger and more dramatic */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-200",
          side === "left"
            ? `bg-gradient-to-r ${colors.bg} via-red-500/20 to-transparent`
            : `bg-gradient-to-l ${colors.bg} via-red-500/20 to-transparent`,
          phase === "flash" ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Hurt vignette effect */}
      {(phase === "flash" || phase === "number") && (
        <div
          className="absolute inset-0 animate-hurt-vignette"
          style={{
            boxShadow: `inset 0 0 100px 40px rgba(255, 0, 0, 0.4)`,
          }}
        />
      )}

      {/* Screen shake effect via CSS animation */}
      <div
        className={cn(
          "absolute inset-0",
          phase === "flash" && (isBigHit ? "animate-screen-mega-shake" : "animate-screen-shake")
        )}
      />

      {/* CRITICAL HIT banner */}
      {showCritical && (
        <div
          className={cn(
            "absolute top-[20%] left-1/2 -translate-x-1/2 z-60",
            phase === "fade" ? "animate-damage-fade-epic" : "animate-critical-hit-text"
          )}
        >
          <div
            className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider whitespace-nowrap"
            style={{
              color: "#ff4444",
              textShadow: `0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff4444, 0 0 80px white`,
              WebkitTextStroke: "1px white",
            }}
          >
            DEVASTATING!
          </div>
        </div>
      )}

      {/* Damage number and player name - MUCH LARGER */}
      {showNumber && (
        <div
          className={cn(
            "absolute flex flex-col items-center gap-2",
            side === "left" ? "right-4 sm:right-8 md:right-12" : "left-4 sm:left-8 md:left-12",
            "top-1/2 -translate-y-1/2",
            phase === "fade" ? "animate-damage-fade-epic" : "animate-damage-number-epic"
          )}
        >
          {/* Asset image (if available) - larger */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={playerName}
              className={cn(
                "rounded-full border-3 object-cover shadow-2xl",
                isCriticalHit ? "w-16 h-16 sm:w-20 sm:h-20" : isBigHit ? "w-14 h-14 sm:w-16 sm:h-16" : "w-12 h-12 sm:w-14 sm:h-14",
                colors.glow
              )}
              style={{
                boxShadow: `0 0 30px ${colors.hex}`,
              }}
            />
          )}

          {/* MEGA Damage number */}
          <div
            className={cn(
              "font-black tabular-nums",
              isCriticalHit 
                ? "text-7xl sm:text-8xl md:text-9xl" 
                : isBigHit 
                  ? "text-6xl sm:text-7xl md:text-8xl" 
                  : "text-5xl sm:text-6xl md:text-7xl",
              colors.text
            )}
            style={{
              textShadow: `0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor, 0 0 80px ${colors.hex}`,
              WebkitTextStroke: isCriticalHit ? "3px rgba(255,255,255,0.5)" : "2px rgba(255,255,255,0.3)",
            }}
          >
            -{damage.toFixed(1)}
          </div>

          {/* Damage type indicator for big hits */}
          {isBigHit && (
            <div
              className={cn(
                "font-black uppercase tracking-widest",
                isCriticalHit ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
                "text-red-400 animate-pulse"
              )}
              style={{
                textShadow: "0 0 10px #ff0000, 0 0 20px #ff0000",
              }}
            >
              {isCriticalHit ? "MASSIVE DAMAGE!" : "BIG HIT!"}
            </div>
          )}

          {/* Player name - larger and more prominent */}
          <div
            className={cn(
              "font-bold uppercase tracking-wider",
              "text-white/95 bg-black/80 rounded-full",
              isBigHit ? "text-base sm:text-lg px-4 py-1.5" : "text-sm sm:text-base px-3 py-1",
              "max-w-[180px] sm:max-w-[220px] truncate"
            )}
            style={{
              boxShadow: `0 0 20px ${colors.hex}60`,
            }}
          >
            {playerName}
          </div>

          {/* Impact particles - MORE and BIGGER */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(isCriticalHit ? 16 : isBigHit ? 12 : 8)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute rounded-full",
                  colors.text.replace("text-", "bg-"),
                  "animate-damage-particle-mega"
                )}
                style={{
                  left: "50%",
                  top: "50%",
                  width: isCriticalHit ? "10px" : isBigHit ? "8px" : "6px",
                  height: isCriticalHit ? "10px" : isBigHit ? "8px" : "6px",
                  animationDelay: `${i * 60}ms`,
                  "--particle-angle": `${i * (360 / (isCriticalHit ? 16 : isBigHit ? 12 : 8))}deg`,
                  "--particle-distance": `${80 + Math.random() * 60}px`,
                  boxShadow: `0 0 12px ${colors.hex}`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Secondary particle burst for critical hits */}
          {isCriticalHit && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={`crit-${i}`}
                  className="absolute bg-white rounded-full animate-damage-particle-mega"
                  style={{
                    left: "50%",
                    top: "50%",
                    width: "6px",
                    height: "16px",
                    animationDelay: `${i * 80 + 200}ms`,
                    "--particle-angle": `${i * 45 + 22.5}deg`,
                    "--particle-distance": "120px",
                    boxShadow: `0 0 20px white, 0 0 40px ${colors.hex}`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Radial impact wave */}
      {phase === "flash" && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2",
            side === "left" ? "right-[20%]" : "left-[20%]"
          )}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-energy-nova"
            style={{
              width: isCriticalHit ? "180px" : isBigHit ? "140px" : "100px",
              height: isCriticalHit ? "180px" : isBigHit ? "140px" : "100px",
              background: `radial-gradient(circle, ${colors.hex}60 0%, ${colors.hex}30 50%, transparent 80%)`,
              "--nova-color": `${colors.hex}50`,
            } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
}
