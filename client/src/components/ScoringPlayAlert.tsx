import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Flame, Trophy, Zap, Star, X } from "lucide-react";
import type { ScoringPlay } from "@/hooks/useScoringPlayAnimation";

/**
 * ScoringPlayAlert Component
 * 
 * A dramatic, full-width banner that slides down from the top
 * for significant scoring events with game-show style animations.
 */

interface ScoringPlayAlertProps {
  play: ScoringPlay | null;
  onDismiss?: () => void;
  autoDismissDelay?: number;
  className?: string;
}

export function ScoringPlayAlert({
  play,
  onDismiss,
  autoDismissDelay = 4000,
  className,
}: ScoringPlayAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onDismiss?.();
    }, 500);
  }, [onDismiss]);

  // Show alert when play changes
  useEffect(() => {
    if (play) {
      setIsVisible(true);
      setDisplayedPoints(0);
      setIsExiting(false);

      // Animate point counter
      const targetPoints = play.points;
      const duration = 800; // ms
      const steps = 20;
      const increment = targetPoints / steps;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayedPoints(targetPoints);
          clearInterval(interval);
        } else {
          setDisplayedPoints(Math.floor(increment * currentStep));
        }
      }, stepDuration);

      // Auto-dismiss
      const dismissTimeout = setTimeout(() => {
        handleDismiss();
      }, autoDismissDelay);

      return () => {
        clearInterval(interval);
        clearTimeout(dismissTimeout);
      };
    }
  }, [play, autoDismissDelay, handleDismiss]);

  if (!isVisible || !play) return null;

  const isMassive = play.points >= 50;
  const isBig = play.points >= 20;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 pointer-events-none",
        className
      )}
    >
      <div
        className={cn(
          "mx-4 mt-4 pointer-events-auto",
          "rounded-3xl overflow-hidden",
          "scoring-alert-container",
          isExiting && "scoring-alert-exit"
        )}
      >
        {/* Background with Gradient */}
        <div
          className={cn(
            "relative",
            "bg-gradient-to-r",
            isMassive
              ? "from-[#ff744d] via-[#ff5c47] to-[#ff744d]"
              : isBig
              ? "from-[#cfff4d] via-[#a3ff12] to-[#cfff4d]"
              : "from-primary via-primary/90 to-primary"
          )}
        >
          {/* Animated Shine Effect */}
          <div className="absolute inset-0 scoring-alert-shine" />
          
          {/* Particle Effects for Massive Plays */}
          {isMassive && (
            <>
              <div className="absolute top-2 left-[10%] w-2 h-2 rounded-full bg-white/60 scoring-alert-particle" style={{ animationDelay: "0s" }} />
              <div className="absolute top-4 left-[30%] w-3 h-3 rounded-full bg-white/40 scoring-alert-particle" style={{ animationDelay: "0.2s" }} />
              <div className="absolute top-1 right-[20%] w-2 h-2 rounded-full bg-white/50 scoring-alert-particle" style={{ animationDelay: "0.4s" }} />
              <div className="absolute top-3 right-[40%] w-2 h-2 rounded-full bg-white/60 scoring-alert-particle" style={{ animationDelay: "0.6s" }} />
            </>
          )}

          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Icon and Category */}
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center",
                    "bg-black/20 backdrop-blur-sm",
                    "scoring-alert-icon"
                  )}
                >
                  {play.isStreakBonus ? (
                    <Flame className="w-8 h-8 text-white scoring-alert-icon-bounce" />
                  ) : play.isRankBonus ? (
                    <Trophy className="w-8 h-8 text-white scoring-alert-icon-bounce" />
                  ) : play.isBonus ? (
                    <Star className="w-8 h-8 text-white scoring-alert-icon-bounce" />
                  ) : (
                    <Zap className="w-8 h-8 text-white scoring-alert-icon-bounce" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs font-black uppercase tracking-[0.2em]",
                        isMassive || isBig ? "text-black/70" : "text-black/60"
                      )}
                    >
                      {isMassive ? "🔥 MASSIVE PLAY 🔥" : isBig ? "⚡ BIG PLAY ⚡" : "SCORING PLAY"}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-lg font-bold",
                      isMassive || isBig ? "text-black" : "text-black/90"
                    )}
                  >
                    {play.category}
                  </div>
                  <div className="text-sm text-black/60">
                    {play.assetName} · {play.teamName}
                  </div>
                </div>
              </div>

              {/* Right: Points Counter */}
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "px-6 py-3 rounded-2xl",
                    "bg-black/20 backdrop-blur-sm",
                    "flex flex-col items-center",
                    "scoring-alert-points"
                  )}
                >
                  <div
                    className={cn(
                      "text-4xl font-black tabular-nums",
                      isMassive || isBig ? "text-white" : "text-white"
                    )}
                  >
                    +{displayedPoints}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Points
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={handleDismiss}
                  className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-1 rounded-full bg-black/20 overflow-hidden">
              <div
                className="h-full bg-white/50 rounded-full scoring-alert-progress"
                style={{
                  animationDuration: `${autoDismissDelay}ms`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage multiple alerts in a queue
 */
export function useScoringAlertQueue() {
  const [alertQueue, setAlertQueue] = useState<ScoringPlay[]>([]);
  const [currentAlert, setCurrentAlert] = useState<ScoringPlay | null>(null);

  const addAlert = useCallback((play: ScoringPlay) => {
    setAlertQueue((prev) => [...prev, play]);
  }, []);

  const dismissCurrent = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  // Process queue
  useEffect(() => {
    if (!currentAlert && alertQueue.length > 0) {
      const [next, ...rest] = alertQueue;
      setCurrentAlert(next);
      setAlertQueue(rest);
    }
  }, [currentAlert, alertQueue]);

  return {
    currentAlert,
    addAlert,
    dismissCurrent,
    queueLength: alertQueue.length,
  };
}

export default ScoringPlayAlert;

