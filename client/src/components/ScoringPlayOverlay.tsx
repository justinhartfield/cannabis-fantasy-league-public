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
 * Displays EPIC attack effects when a scoring play happens:
 * - Massive slash marks spanning the screen
 * - Large energy nova bursts
 * - Screen-filling impact particles
 * - Dramatic flash overlays
 * - Fighter lunge animation trigger
 */
export function ScoringPlayOverlay({
  play,
  leftTeamId,
  rightTeamId,
  onComplete,
}: ScoringPlayOverlayProps) {
  const [phase, setPhase] = useState<"idle" | "lunge" | "impact" | "slash" | "sustain" | "complete">("idle");
  const [slashMarks, setSlashMarks] = useState<Array<{ id: number; angle: number; delay: number; length: number }>>([]);
  const [showMegaFlash, setShowMegaFlash] = useState(false);

  // Determine attack direction
  const attackerIsLeft = play?.attackingTeamId === leftTeamId;
  const color = play ? PLAYER_TYPE_COLORS[play.playerType] || PLAYER_TYPE_COLORS.manufacturer : "#fff";
  const isBigHit = (play?.pointsScored ?? 0) >= 10;
  const isCriticalHit = (play?.pointsScored ?? 0) >= 20;

  useEffect(() => {
    if (!play) {
      setPhase("idle");
      setSlashMarks([]);
      setShowMegaFlash(false);
      return;
    }

    // Generate random slash marks - more slashes for bigger hits
    const numSlashes = isCriticalHit ? 6 : isBigHit ? 4 : 3;
    const marks = Array.from({ length: numSlashes }, (_, i) => ({
      id: i,
      angle: -60 + (Math.random() * 40 - 20) + (i * 15), // Spread slashes across angles
      delay: i * 100,
      length: 60 + Math.random() * 30, // 60-90% of available space
    }));
    setSlashMarks(marks);

    // Animation sequence - extended timings for epic effect
    setPhase("lunge");

    const impactTimer = setTimeout(() => {
      setPhase("impact");
      setShowMegaFlash(true);
    }, 350);

    const slashTimer = setTimeout(() => setPhase("slash"), 500);
    
    const megaFlashOffTimer = setTimeout(() => {
      setShowMegaFlash(false);
    }, 900);

    const sustainTimer = setTimeout(() => setPhase("sustain"), 1500);

    // Extended complete timer for longer animation (3 seconds total)
    const completeTimer = setTimeout(() => {
      setPhase("complete");
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(impactTimer);
      clearTimeout(slashTimer);
      clearTimeout(megaFlashOffTimer);
      clearTimeout(sustainTimer);
      clearTimeout(completeTimer);
    };
  }, [play, onComplete, isBigHit, isCriticalHit]);

  if (phase === "idle" || !play) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* MEGA screen shake container */}
      <div className={cn(
        phase === "impact" && (isBigHit ? "animate-screen-mega-shake" : "animate-screen-shake")
      )}>
        
        {/* Full-screen dramatic flash overlay */}
        {showMegaFlash && (
          <div
            className={cn(
              "absolute inset-0",
              isCriticalHit ? "animate-impact-mega-flash" : "animate-impact-flash"
            )}
            style={{
              backgroundColor: isCriticalHit ? `${color}50` : `${color}35`,
            }}
          />
        )}

        {/* Secondary pulsing vignette for big hits */}
        {isBigHit && (phase === "impact" || phase === "slash") && (
          <div 
            className="absolute inset-0 animate-hurt-vignette"
            style={{
              "--hurt-color": color,
            } as React.CSSProperties}
          />
        )}

        {/* MASSIVE Energy nova from attacker - much larger radius */}
        {(phase === "impact" || phase === "slash") && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              attackerIsLeft ? "left-[35%]" : "right-[35%]"
            )}
          >
            {/* Primary nova burst - 120px radius */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-energy-nova"
              style={{
                width: isCriticalHit ? "200px" : isBigHit ? "160px" : "120px",
                height: isCriticalHit ? "200px" : isBigHit ? "160px" : "120px",
                background: `radial-gradient(circle, ${color}90 0%, ${color}60 30%, ${color}30 60%, transparent 80%)`,
                "--nova-color": `${color}80`,
              } as React.CSSProperties}
            />
            
            {/* Secondary expanding ring */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 animate-energy-nova"
              style={{
                width: isCriticalHit ? "160px" : isBigHit ? "120px" : "100px",
                height: isCriticalHit ? "160px" : isBigHit ? "120px" : "100px",
                borderColor: color,
                animationDelay: "0.1s",
                "--nova-color": `${color}60`,
              } as React.CSSProperties}
            />

            {/* Third ring for critical hits */}
            {isCriticalHit && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-energy-nova"
                style={{
                  width: "240px",
                  height: "240px",
                  borderColor: `${color}80`,
                  animationDelay: "0.2s",
                  "--nova-color": `${color}40`,
                } as React.CSSProperties}
              />
            )}

            {/* Inner bright core */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: "40px",
                height: "40px",
                background: `radial-gradient(circle, white 0%, ${color} 50%, transparent 100%)`,
                boxShadow: `0 0 60px 20px ${color}`,
                animation: "energy-blast 0.6s ease-out forwards",
              }}
            />
          </div>
        )}

        {/* EPIC Slash marks - spanning 60-80% of screen width */}
        {(phase === "slash" || phase === "sustain") && slashMarks.map((mark) => (
          <div
            key={mark.id}
            className={cn(
              "absolute top-1/2",
              attackerIsLeft ? "right-[10%]" : "left-[10%]"
            )}
            style={{
              transform: `translateY(-50%)`,
              animationDelay: `${mark.delay}ms`,
            }}
          >
            {/* MEGA Slash line - much wider */}
            <div
              className="origin-center animate-slash-mega"
              style={{
                width: `${mark.length}vw`,
                height: isCriticalHit ? "8px" : isBigHit ? "6px" : "4px",
                background: `linear-gradient(90deg, transparent 0%, ${color}40 10%, ${color} 30%, white 50%, ${color} 70%, ${color}40 90%, transparent 100%)`,
                boxShadow: `0 0 30px ${color}, 0 0 60px ${color}, 0 0 90px ${color}80`,
                "--slash-angle": `${mark.angle}deg`,
                filter: "blur(0.5px)",
              } as React.CSSProperties}
            />

            {/* Slash afterglow trail */}
            <div
              className="absolute top-0 left-0 origin-center animate-slash-mega"
              style={{
                width: `${mark.length * 0.8}vw`,
                height: isCriticalHit ? "16px" : isBigHit ? "12px" : "8px",
                background: `linear-gradient(90deg, transparent 0%, ${color}20 20%, ${color}40 50%, ${color}20 80%, transparent 100%)`,
                "--slash-angle": `${mark.angle}deg`,
                animationDelay: `${mark.delay + 50}ms`,
                filter: "blur(4px)",
              } as React.CSSProperties}
            />
          </div>
        ))}

        {/* MEGA Impact sparks - more particles, wider spread */}
        {(phase === "impact" || phase === "slash" || phase === "sustain") && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              attackerIsLeft ? "right-[25%]" : "left-[25%]"
            )}
          >
            {[...Array(isCriticalHit ? 24 : isBigHit ? 16 : 10)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-damage-particle-mega"
                style={{
                  width: isCriticalHit ? "8px" : isBigHit ? "6px" : "4px",
                  height: isCriticalHit ? "8px" : isBigHit ? "6px" : "4px",
                  backgroundColor: i % 3 === 0 ? "white" : color,
                  boxShadow: `0 0 ${isBigHit ? 16 : 12}px ${color}`,
                  animationDelay: `${i * 40}ms`,
                  "--particle-angle": `${i * (360 / (isCriticalHit ? 24 : isBigHit ? 16 : 10))}deg`,
                  "--particle-distance": `${100 + Math.random() * 80}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Additional spark trails for critical hits */}
        {isCriticalHit && (phase === "impact" || phase === "slash") && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              attackerIsLeft ? "right-[30%]" : "left-[30%]"
            )}
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={`trail-${i}`}
                className="absolute rounded-full animate-damage-particle-mega"
                style={{
                  width: "4px",
                  height: "12px",
                  backgroundColor: "white",
                  boxShadow: `0 0 20px ${color}`,
                  animationDelay: `${i * 60 + 100}ms`,
                  "--particle-angle": `${i * 30 + 15}deg`,
                  "--particle-distance": `${150 + Math.random() * 60}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* CRITICAL HIT text for massive damage */}
        {isCriticalHit && phase === "slash" && (
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2">
            <div
              className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-wider animate-critical-hit-text"
              style={{
                color: color,
                textShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}, 0 0 80px white`,
                WebkitTextStroke: "2px white",
              }}
            >
              CRITICAL HIT!
            </div>
          </div>
        )}

        {/* Player name and points indicator - larger and more prominent */}
        {(phase === "slash" || phase === "sustain") && (
          <div
            className={cn(
              "absolute flex flex-col items-center gap-2",
              attackerIsLeft ? "left-[20%] -translate-x-1/2" : "right-[20%] translate-x-1/2",
              "top-[25%]"
            )}
          >
            {/* Points badge - larger */}
            <div
              className={cn(
                "px-6 py-2 rounded-full text-white font-black animate-combo-pop",
                isCriticalHit ? "text-4xl" : isBigHit ? "text-3xl" : "text-2xl"
              )}
              style={{
                backgroundColor: color,
                boxShadow: `0 0 30px ${color}, 0 0 60px ${color}80`,
              }}
            >
              +{play.pointsScored.toFixed(1)}
            </div>
            
            {/* Player name - larger */}
            <div 
              className={cn(
                "font-bold text-white/95 bg-black/70 px-4 py-1 rounded-full animate-fade-in",
                isBigHit ? "text-base" : "text-sm"
              )}
              style={{
                maxWidth: "200px",
                boxShadow: `0 0 20px ${color}40`,
              }}
            >
              <span className="truncate block">{play.playerName}</span>
            </div>
          </div>
        )}

        {/* Speed lines effect during attack */}
        {phase === "lunge" && (
          <div className={cn(
            "absolute inset-0 overflow-hidden",
            attackerIsLeft ? "speed-lines-right" : "speed-lines-left"
          )}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{
                  top: `${15 + i * 10}%`,
                  left: attackerIsLeft ? "30%" : "auto",
                  right: attackerIsLeft ? "auto" : "30%",
                  width: "40%",
                  animation: "slash-mega 0.4s ease-out forwards",
                  animationDelay: `${i * 30}ms`,
                  "--slash-angle": "0deg",
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
