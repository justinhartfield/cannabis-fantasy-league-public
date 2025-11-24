import { useEffect, useState } from "react";
import { Clock, Pause, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraftClockProps {
  pickNumber: number;
  round: number;
  teamName: string;
  isYourTurn: boolean;
  timeLimit: number; // Total time in seconds
  remainingTime: number; // Remaining time in seconds
  isPaused: boolean;
  onTimerExpired?: () => void;
  compact?: boolean;
}

export function DraftClock({
  pickNumber,
  round,
  teamName,
  isYourTurn,
  timeLimit,
  remainingTime,
  isPaused,
  onTimerExpired,
  compact = false,
}: DraftClockProps) {
  const [displayTime, setDisplayTime] = useState(remainingTime);

  useEffect(() => {
    setDisplayTime(remainingTime);
  }, [remainingTime]);

  useEffect(() => {
    if (displayTime <= 0 && onTimerExpired) {
      onTimerExpired();
    }
  }, [displayTime, onTimerExpired]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage (inverted - starts at 100% and goes to 0%)
  const progress = (displayTime / timeLimit) * 100;

  // Determine urgency level
  const getUrgencyLevel = () => {
    if (displayTime <= 10) return "critical";
    if (displayTime <= 30) return "warning";
    return "normal";
  };

  const urgency = getUrgencyLevel();

  // Color schemes based on urgency
  const getColorScheme = () => {
    switch (urgency) {
      case "critical":
        return {
          bg: "bg-red-50 dark:bg-red-950/20",
          border: "border-red-500",
          text: "text-red-700 dark:text-red-400",
          progress: "bg-red-500",
          badge: "bg-red-500",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-950/20",
          border: "border-yellow-500",
          text: "text-yellow-700 dark:text-yellow-400",
          progress: "bg-yellow-500",
          badge: "bg-yellow-500",
        };
      default:
        return {
          bg: "bg-green-50 dark:bg-green-950/20",
          border: "border-green-500",
          text: "text-green-700 dark:text-green-400",
          progress: "bg-green-500",
          badge: "bg-green-500",
        };
    }
  };

  const colors = getColorScheme();

  if (compact) {
    return (
      <div className={cn(
        "rounded-full border border-white/10 bg-[#2f1546]/95 backdrop-blur shadow-lg px-4 py-2 flex items-center gap-3 text-white transition-all duration-300",
        urgency === "critical" && "border-red-500 bg-red-900/90 animate-pulse",
        urgency === "warning" && "border-yellow-500"
      )}>
        <div className="flex items-center gap-2">
          <Clock className={cn("w-4 h-4", urgency === "critical" ? "text-red-400" : "text-[#cfff4d]")} />
          <span className={cn("text-lg font-bold font-mono", urgency === "critical" ? "text-red-400" : "text-[#cfff4d]")}>
            {formatTime(displayTime)}
          </span>
        </div>
        <div className="h-4 w-[1px] bg-white/20" />
        <div className="flex flex-col leading-none">
          <span className="text-[10px] uppercase tracking-wider text-white/60">
            {isYourTurn ? "Dein Zug" : "Warten"}
          </span>
          <span className="text-xs font-semibold max-w-[80px] truncate">
            {isYourTurn ? "Du bist dran!" : teamName}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1a0f28] to-[#2f0f42] p-6 text-white shadow-[0_25px_55px_rgba(10,6,25,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Draft Clock</p>
          <p className="text-sm text-white/70">
            Pick #{pickNumber} • Runde {round}
          </p>
        </div>
        {isPaused && (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <Pause className="w-3 h-3" />
            Pausiert
          </span>
        )}
      </div>

      <div className="mt-6 text-center">
        <Clock className="w-6 h-6 mx-auto text-[#cfff4d]" />
        <div className="mt-3 text-6xl font-black text-[#cfff4d] font-mono tracking-wider">
          {formatTime(displayTime)}
        </div>
        <p className="mt-1 text-sm text-white/70">
          {isPaused ? "Timer pausiert" : "Verbleibende Zeit"}
        </p>
        <p className="mt-2 text-sm font-semibold">
          {isYourTurn ? `${teamName} ist am Zug` : `Warten auf ${teamName}`}
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <div className="h-3 w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#cfff4d] via-[#8df6a2] to-[#6be1ff] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/60">
          <span>0:00</span>
          <span>{formatTime(timeLimit)}</span>
        </div>
      </div>

      {(urgency === "critical" || urgency === "warning") && (
        <div
          className={cn(
            "mt-5 flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium",
            urgency === "critical"
              ? "border-red-400 bg-red-500/10 text-red-200"
              : "border-yellow-400 bg-yellow-500/10 text-yellow-100"
          )}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {urgency === "critical"
            ? "Letzte Sekunden! Jetzt picken oder Auto-Pick wird aktiv."
            : "Unter 30 Sekunden – beeil dich mit dem Pick!"}
        </div>
      )}
    </div>
  );
}
