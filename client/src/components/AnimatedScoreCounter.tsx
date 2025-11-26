import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * AnimatedScoreCounter Component
 * 
 * A dramatic, slot-machine style score counter with:
 * - Flip animation when score changes
 * - Glow pulse effect
 * - Particle burst on big increases
 * - Delta badge showing score change
 */

interface AnimatedScoreCounterProps {
  value: number;
  previousValue?: number;
  className?: string;
  /** Minimum change to trigger big celebration (default: 10) */
  bigChangeThreshold?: number;
  /** Show decimal places (default: 1) */
  decimals?: number;
  /** Color for glow effect */
  glowColor?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Label text below the score */
  label?: string;
  /** Whether to show particles */
  showParticles?: boolean;
  /** Whether to show delta badge */
  showDelta?: boolean;
}

const PARTICLE_COLORS = [
  "#cfff4d", // Weed green
  "#a3ff12", // Bright green
  "#ff5c47", // Coral
  "#ffd700", // Gold
  "#ffffff", // White
];

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360;
    const distance = 40 + Math.random() * 30;
    const x = Math.cos((angle * Math.PI) / 180) * distance;
    const y = Math.sin((angle * Math.PI) / 180) * distance;
    
    return {
      id: i,
      x,
      y,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      delay: Math.random() * 0.1,
    };
  });
}

export function AnimatedScoreCounter({
  value,
  previousValue,
  className,
  bigChangeThreshold = 10,
  decimals = 1,
  glowColor = "#cfff4d",
  size = "lg",
  label = "Points",
  showParticles = true,
  showDelta = true,
}: AnimatedScoreCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [showBigShake, setShowBigShake] = useState(false);
  const [particles, setParticles] = useState<ReturnType<typeof generateParticles>>([]);
  const [delta, setDelta] = useState<number | null>(null);
  const [showDeltaBadge, setShowDeltaBadge] = useState(false);
  const prevValueRef = useRef(previousValue ?? value);
  const animationFrameRef = useRef<number | null>(null);

  // Size classes
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl sm:text-5xl",
    xl: "text-5xl sm:text-6xl",
  };

  const labelSizeClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-xs",
    xl: "text-sm",
  };

  // Animate value change
  useEffect(() => {
    const prevValue = prevValueRef.current;
    const change = value - prevValue;
    
    if (Math.abs(change) < 0.01) {
      setDisplayValue(value);
      return;
    }

    // Trigger animations
    setIsAnimating(true);
    setShowGlow(true);
    
    // Show delta
    if (showDelta && change !== 0) {
      setDelta(change);
      setShowDeltaBadge(true);
    }

    // Big change effects
    const isBigChange = Math.abs(change) >= bigChangeThreshold;
    if (isBigChange) {
      setShowBigShake(true);
      if (showParticles) {
        setParticles(generateParticles(12));
      }
    }

    // Animate counting
    const duration = isBigChange ? 800 : 500;
    const startTime = performance.now();
    const startValue = prevValue;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + change * easeOutCubic;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsAnimating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    prevValueRef.current = value;

    // Clear animations after delay
    const glowTimeout = setTimeout(() => setShowGlow(false), 1200);
    const shakeTimeout = setTimeout(() => setShowBigShake(false), 600);
    const particleTimeout = setTimeout(() => setParticles([]), 800);
    const deltaTimeout = setTimeout(() => setShowDeltaBadge(false), 3000);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(glowTimeout);
      clearTimeout(shakeTimeout);
      clearTimeout(particleTimeout);
      clearTimeout(deltaTimeout);
    };
  }, [value, bigChangeThreshold, showParticles, showDelta]);

  // Update previous value ref when previousValue prop changes
  useEffect(() => {
    if (previousValue !== undefined) {
      prevValueRef.current = previousValue;
    }
  }, [previousValue]);

  const formattedValue = useMemo(() => {
    return displayValue.toFixed(decimals);
  }, [displayValue, decimals]);

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      {/* Score Container with 3D perspective */}
      <div 
        className={cn(
          "score-counter-3d relative",
          showBigShake && "score-big-shake"
        )}
        style={{ "--score-glow-color": glowColor } as React.CSSProperties}
      >
        {/* Particles */}
        {particles.length > 0 && (
          <div className="score-particles">
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="score-particle"
                style={{
                  "--particle-x": `${particle.x}px`,
                  "--particle-y": `${particle.y}px`,
                  backgroundColor: particle.color,
                  animationDelay: `${particle.delay}s`,
                  left: "50%",
                  top: "50%",
                  boxShadow: `0 0 6px ${particle.color}`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Score Number */}
        <div
          className={cn(
            "font-black tabular-nums text-white",
            sizeClasses[size],
            isAnimating && "score-flip-enter",
            showGlow && "score-glow-pulse"
          )}
        >
          {formattedValue}
        </div>

        {/* Delta Badge */}
        {showDeltaBadge && delta !== null && delta !== 0 && (
          <div
            className={cn(
              "absolute -top-2 -right-4 px-2 py-0.5 rounded-full text-xs font-bold",
              "score-delta-badge score-delta-fadeout",
              delta > 0
                ? "bg-[#cfff4d] text-black"
                : "bg-red-500 text-white"
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(decimals)}
          </div>
        )}
      </div>

      {/* Label */}
      {label && (
        <div className={cn(
          "uppercase tracking-wider text-white/50 mt-1",
          labelSizeClasses[size]
        )}>
          {label}
        </div>
      )}
    </div>
  );
}

export default AnimatedScoreCounter;

