import { useEffect, useState, useMemo } from "react";
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

// Attack phrases that get randomly selected
const ATTACK_PHRASES = [
  "STRIKES!",
  "ATTACKS!",
  "SCORES!",
  "HITS!",
  "CONNECTS!",
  "LANDS A HIT!",
  "DELIVERS!",
];

const BIG_HIT_PHRASES = [
  "DEVASTATING BLOW!",
  "CRUSHING HIT!",
  "MASSIVE STRIKE!",
  "POWERFUL ATTACK!",
  "HEAVY DAMAGE!",
  "BRUTAL FORCE!",
];

const CRITICAL_PHRASES = [
  "CRITICAL HIT!!!",
  "SUPER EFFECTIVE!!!",
  "KNOCKOUT BLOW!!!",
  "ULTRA COMBO!!!",
  "MAXIMUM DAMAGE!!!",
  "OBLITERATION!!!",
];

// Animation style variants for variety
type AnimationStyle = "slashes" | "explosion" | "lightning" | "shockwave" | "burst";

/**
 * ScoringPlayOverlay Component
 * 
 * Displays EPIC attack effects when a scoring play happens with RANDOMIZED animations:
 * - Multiple animation styles for variety
 * - Full-screen attack alerts with verbose text
 * - Mobile-optimized centered layout
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

  // Randomize animation style and phrases on each play
  const animationConfig = useMemo(() => {
    if (!play) return null;
    
    const styles: AnimationStyle[] = ["slashes", "explosion", "lightning", "shockwave", "burst"];
    const style = styles[Math.floor(Math.random() * styles.length)];
    
    const isBigHit = play.pointsScored >= 10;
    const isCriticalHit = play.pointsScored >= 20;
    
    let phrase: string;
    if (isCriticalHit) {
      phrase = CRITICAL_PHRASES[Math.floor(Math.random() * CRITICAL_PHRASES.length)];
    } else if (isBigHit) {
      phrase = BIG_HIT_PHRASES[Math.floor(Math.random() * BIG_HIT_PHRASES.length)];
    } else {
      phrase = ATTACK_PHRASES[Math.floor(Math.random() * ATTACK_PHRASES.length)];
    }
    
    return { style, phrase, isBigHit, isCriticalHit };
  }, [play]);

  // Determine attack direction
  const attackerIsLeft = play?.attackingTeamId === leftTeamId;
  const color = play ? PLAYER_TYPE_COLORS[play.playerType] || PLAYER_TYPE_COLORS.manufacturer : "#fff";

  useEffect(() => {
    if (!play || !animationConfig) {
      setPhase("idle");
      setSlashMarks([]);
      setShowMegaFlash(false);
      return;
    }

    const { isBigHit, isCriticalHit, style } = animationConfig;

    // Generate random slash marks based on style
    const numSlashes = style === "slashes" 
      ? (isCriticalHit ? 6 : isBigHit ? 4 : 3)
      : (isCriticalHit ? 4 : isBigHit ? 3 : 2);
    
    const marks = Array.from({ length: numSlashes }, (_, i) => ({
      id: i,
      angle: style === "burst" 
        ? (i * (360 / numSlashes)) - 90
        : style === "lightning"
          ? -90 + (Math.random() * 20 - 10)
          : -60 + (Math.random() * 40 - 20) + (i * 15),
      delay: style === "burst" ? i * 50 : i * 100,
      length: style === "explosion" ? 40 + Math.random() * 20 : 60 + Math.random() * 30,
    }));
    setSlashMarks(marks);

    // Animation sequence
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
  }, [play, onComplete, animationConfig]);

  if (phase === "idle" || !play || !animationConfig) return null;

  const { isBigHit, isCriticalHit, phrase, style } = animationConfig;

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

        {/* MASSIVE Energy effects - varies by style */}
        {(phase === "impact" || phase === "slash") && (
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            )}
          >
            {/* Primary nova burst */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-energy-nova"
              style={{
                width: isCriticalHit ? "250px" : isBigHit ? "200px" : "150px",
                height: isCriticalHit ? "250px" : isBigHit ? "200px" : "150px",
                background: style === "explosion"
                  ? `radial-gradient(circle, white 0%, ${color}90 20%, ${color}60 40%, ${color}30 60%, transparent 80%)`
                  : `radial-gradient(circle, ${color}90 0%, ${color}60 30%, ${color}30 60%, transparent 80%)`,
                "--nova-color": `${color}80`,
              } as React.CSSProperties}
            />
            
            {/* Secondary expanding ring */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 animate-energy-nova"
              style={{
                width: isCriticalHit ? "200px" : isBigHit ? "160px" : "120px",
                height: isCriticalHit ? "200px" : isBigHit ? "160px" : "120px",
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
                  width: "300px",
                  height: "300px",
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
                width: isCriticalHit ? "60px" : "40px",
                height: isCriticalHit ? "60px" : "40px",
                background: `radial-gradient(circle, white 0%, ${color} 50%, transparent 100%)`,
                boxShadow: `0 0 80px 30px ${color}`,
                animation: "energy-blast 0.6s ease-out forwards",
              }}
            />
          </div>
        )}

        {/* Slash marks - style dependent */}
        {(phase === "slash" || phase === "sustain") && slashMarks.map((mark) => (
          <div
            key={mark.id}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(-50%, -50%)`,
              animationDelay: `${mark.delay}ms`,
            }}
          >
            <div
              className="origin-center animate-slash-mega"
              style={{
                width: style === "burst" ? "50vw" : `${mark.length}vw`,
                height: isCriticalHit ? "8px" : isBigHit ? "6px" : "4px",
                background: style === "lightning"
                  ? `linear-gradient(90deg, transparent 0%, white 20%, ${color} 50%, white 80%, transparent 100%)`
                  : `linear-gradient(90deg, transparent 0%, ${color}40 10%, ${color} 30%, white 50%, ${color} 70%, ${color}40 90%, transparent 100%)`,
                boxShadow: `0 0 30px ${color}, 0 0 60px ${color}, 0 0 90px ${color}80`,
                "--slash-angle": `${mark.angle}deg`,
                filter: style === "lightning" ? "blur(1px)" : "blur(0.5px)",
              } as React.CSSProperties}
            />
          </div>
        ))}

        {/* Impact sparks - centered */}
        {(phase === "impact" || phase === "slash" || phase === "sustain") && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
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
                  "--particle-distance": `${120 + Math.random() * 100}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* ========== FULL-SCREEN CENTERED ATTACK ALERT - MOBILE OPTIMIZED ========== */}
        {(phase === "slash" || phase === "sustain") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
            {/* Attack phrase banner */}
            <div
              className={cn(
                "font-black uppercase tracking-wider text-center animate-critical-hit-text px-4",
                isCriticalHit 
                  ? "text-3xl sm:text-4xl md:text-5xl" 
                  : isBigHit 
                    ? "text-2xl sm:text-3xl md:text-4xl"
                    : "text-xl sm:text-2xl md:text-3xl"
              )}
              style={{
                color: isCriticalHit ? "#ff4444" : color,
                textShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}, 0 0 80px white`,
                WebkitTextStroke: isCriticalHit ? "2px white" : "1px rgba(255,255,255,0.5)",
              }}
            >
              {phrase}
            </div>

            {/* Player name + team - VERBOSE ALERT */}
            <div className="mt-4 flex flex-col items-center gap-2 animate-combo-pop">
              {/* Points badge - large and centered */}
              <div
                className={cn(
                  "px-8 py-3 rounded-full text-white font-black",
                  isCriticalHit ? "text-5xl sm:text-6xl" : isBigHit ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"
                )}
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 40px ${color}, 0 0 80px ${color}80`,
                }}
              >
                +{play.pointsScored.toFixed(1)}
              </div>
              
              {/* Player name - full width visible */}
              <div 
                className={cn(
                  "font-bold text-white bg-black/80 px-6 py-2 rounded-full text-center",
                  isBigHit ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                )}
                style={{
                  boxShadow: `0 0 20px ${color}60`,
                  maxWidth: "90vw",
                }}
              >
                {play.playerName}
              </div>

              {/* Team attribution - new verbose info */}
              <div 
                className="text-sm sm:text-base font-medium text-white/80 bg-black/60 px-4 py-1 rounded-full"
              >
                {attackerIsLeft ? play.attackingTeamName : play.attackingTeamName} scores!
              </div>
            </div>
          </div>
        )}

        {/* Speed lines effect during attack - adjusted for center */}
        {phase === "lunge" && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                style={{
                  top: `${8 + i * 7}%`,
                  left: attackerIsLeft ? "20%" : "auto",
                  right: attackerIsLeft ? "auto" : "20%",
                  width: "60%",
                  animation: "slash-mega 0.4s ease-out forwards",
                  animationDelay: `${i * 25}ms`,
                  "--slash-angle": `${(Math.random() * 10 - 5)}deg`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
