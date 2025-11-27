import { useEffect, useState, useMemo } from "react";
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

// Damage reaction phrases - randomized for variety
const DAMAGE_PHRASES = [
  "OUCH!",
  "DAMAGE!",
  "HIT!",
  "IMPACT!",
  "STRIKE!",
];

const BIG_DAMAGE_PHRASES = [
  "BIG HIT!",
  "HEAVY DAMAGE!",
  "POWERFUL!",
  "CRUSHING!",
  "BRUTAL!",
];

const CRITICAL_DAMAGE_PHRASES = [
  "DEVASTATING!!!",
  "OBLITERATED!!!",
  "ANNIHILATED!!!",
  "DESTROYED!!!",
  "WRECKED!!!",
];

// Damage animation styles for variety
type DamageStyle = "classic" | "shatter" | "pulse" | "ripple" | "burst";

/**
 * DamageFlash Component
 * 
 * Displays an EPIC damage flash effect with RANDOMIZED animations:
 * - Multiple animation styles for variety
 * - Full-screen centered layout for mobile
 * - Verbose damage indicators
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

  const colors = PLAYER_TYPE_COLORS[playerType] || PLAYER_TYPE_COLORS.manufacturer;
  
  // Randomize animation style and phrases on each activation
  const animationConfig = useMemo(() => {
    if (!isActive) return null;
    
    const isBigHit = damage >= 10;
    const isCriticalHit = damage >= 20;
    
    const styles: DamageStyle[] = ["classic", "shatter", "pulse", "ripple", "burst"];
    const style = styles[Math.floor(Math.random() * styles.length)];
    
    let phrase: string;
    if (isCriticalHit) {
      phrase = CRITICAL_DAMAGE_PHRASES[Math.floor(Math.random() * CRITICAL_DAMAGE_PHRASES.length)];
    } else if (isBigHit) {
      phrase = BIG_DAMAGE_PHRASES[Math.floor(Math.random() * BIG_DAMAGE_PHRASES.length)];
    } else {
      phrase = DAMAGE_PHRASES[Math.floor(Math.random() * DAMAGE_PHRASES.length)];
    }
    
    // Randomize particle count and angles for variety
    const particleCount = isCriticalHit ? 16 + Math.floor(Math.random() * 8) : isBigHit ? 10 + Math.floor(Math.random() * 6) : 6 + Math.floor(Math.random() * 4);
    const particleSpread = 80 + Math.random() * 60;
    
    return { style, phrase, isBigHit, isCriticalHit, particleCount, particleSpread };
  }, [isActive, damage]);

  useEffect(() => {
    if (!isActive || !animationConfig) {
      setPhase("idle");
      setShowNumber(false);
      return;
    }

    // Animation sequence - extended for epic effect (4 seconds total)
    setPhase("flash");
    
    const flashTimer = setTimeout(() => {
      setPhase("number");
      setShowNumber(true);
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
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(sustainTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete, animationConfig]);

  if (phase === "idle" || !animationConfig) return null;

  const { style, phrase, isBigHit, isCriticalHit, particleCount, particleSpread } = animationConfig;

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-50 overflow-hidden"
      )}
    >
      {/* Full-screen flash overlay - both sides */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-200",
          phase === "flash" ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: style === "shatter"
            ? `radial-gradient(circle at ${side === "left" ? "25%" : "75%"} 50%, ${colors.hex}60 0%, transparent 60%)`
            : style === "ripple"
              ? `radial-gradient(circle at ${side === "left" ? "25%" : "75%"} 50%, transparent 0%, ${colors.hex}40 30%, transparent 60%)`
              : `linear-gradient(${side === "left" ? "to right" : "to left"}, ${colors.hex}50 0%, rgba(255,0,0,0.2) 50%, transparent 100%)`,
        }}
      />

      {/* Hurt vignette effect - covers defender's side */}
      {(phase === "flash" || phase === "number") && (
        <div
          className={cn(
            "absolute inset-0 animate-hurt-vignette",
            side === "left" ? "right-1/2" : "left-1/2"
          )}
          style={{
            boxShadow: `inset 0 0 120px 50px rgba(255, 0, 0, 0.5)`,
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

      {/* ========== CENTERED DAMAGE DISPLAY - MOBILE OPTIMIZED ========== */}
      {showNumber && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center",
            phase === "fade" ? "animate-damage-fade-epic" : "animate-damage-number-epic"
          )}
        >
          {/* Damage reaction phrase */}
          <div
            className={cn(
              "font-black uppercase tracking-wider text-center mb-2 animate-critical-hit-text",
              isCriticalHit 
                ? "text-2xl sm:text-3xl md:text-4xl" 
                : isBigHit 
                  ? "text-xl sm:text-2xl md:text-3xl"
                  : "text-lg sm:text-xl md:text-2xl"
            )}
            style={{
              color: "#ff4444",
              textShadow: `0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff4444`,
              WebkitTextStroke: isCriticalHit ? "1px white" : "none",
            }}
          >
            {phrase}
          </div>

          {/* Asset image (if available) - larger */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={playerName}
              className={cn(
                "rounded-full border-3 object-cover shadow-2xl mb-2",
                isCriticalHit ? "w-16 h-16 sm:w-20 sm:h-20" : isBigHit ? "w-14 h-14 sm:w-16 sm:h-16" : "w-12 h-12 sm:w-14 sm:h-14",
                colors.glow
              )}
              style={{
                boxShadow: `0 0 30px ${colors.hex}`,
              }}
            />
          )}

          {/* MEGA Damage number - CENTERED */}
          <div
            className={cn(
              "font-black tabular-nums text-center",
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

          {/* Player name - full width, centered, NOT truncated */}
          <div
            className={cn(
              "mt-3 font-bold uppercase tracking-wider text-center",
              "text-white bg-black/80 rounded-full",
              isBigHit ? "text-base sm:text-lg px-6 py-2" : "text-sm sm:text-base px-4 py-1.5"
            )}
            style={{
              boxShadow: `0 0 20px ${colors.hex}60`,
              maxWidth: "90vw",
            }}
          >
            {playerName}
          </div>

          {/* Damage type label */}
          <div className="mt-2 text-xs sm:text-sm font-medium text-white/70 bg-black/50 px-3 py-1 rounded-full capitalize">
            {playerType?.replace("_", " ")}
          </div>

          {/* Impact particles - centered burst */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {[...Array(particleCount)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute rounded-full",
                  colors.text.replace("text-", "bg-"),
                  "animate-damage-particle-mega"
                )}
                style={{
                  width: isCriticalHit ? "10px" : isBigHit ? "8px" : "6px",
                  height: isCriticalHit ? "10px" : isBigHit ? "8px" : "6px",
                  animationDelay: `${i * 50}ms`,
                  "--particle-angle": `${i * (360 / particleCount) + Math.random() * 15}deg`,
                  "--particle-distance": `${particleSpread + Math.random() * 60}px`,
                  boxShadow: `0 0 12px ${colors.hex}`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Secondary particle burst for critical hits */}
          {isCriticalHit && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {[...Array(8)].map((_, i) => (
                <div
                  key={`crit-${i}`}
                  className="absolute bg-white rounded-full animate-damage-particle-mega"
                  style={{
                    width: "6px",
                    height: "16px",
                    animationDelay: `${i * 80 + 200}ms`,
                    "--particle-angle": `${i * 45 + 22.5}deg`,
                    "--particle-distance": "150px",
                    boxShadow: `0 0 20px white, 0 0 40px ${colors.hex}`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Radial impact wave - centered on defender side */}
      {phase === "flash" && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2",
            side === "left" ? "left-1/4 -translate-x-1/2" : "right-1/4 translate-x-1/2"
          )}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-energy-nova"
            style={{
              width: isCriticalHit ? "200px" : isBigHit ? "160px" : "120px",
              height: isCriticalHit ? "200px" : isBigHit ? "160px" : "120px",
              background: `radial-gradient(circle, ${colors.hex}60 0%, ${colors.hex}30 50%, transparent 80%)`,
              "--nova-color": `${colors.hex}50`,
            } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
}
