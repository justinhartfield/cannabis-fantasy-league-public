import { X, Settings, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface SleeperDraftHeaderProps {
  isYourTurn: boolean;
  currentTeamName: string;
  timerSeconds: number | null;
  onClose: () => void;
  onSettingsClick: () => void;
  autoDraftEnabled: boolean;
}

/**
 * SleeperDraftHeader
 * 
 * Compact header for the Sleeper-style draft interface.
 * Shows: Close button, Turn indicator, Timer, Settings gear
 */
export function SleeperDraftHeader({
  isYourTurn,
  currentTeamName,
  timerSeconds,
  onClose,
  onSettingsClick,
  autoDraftEnabled,
}: SleeperDraftHeaderProps) {
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timerSeconds !== null && timerSeconds <= 30;
  const isCriticalTime = timerSeconds !== null && timerSeconds <= 10;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#1a1d29]">
      {/* Left: Close button */}
      <button
        onClick={onClose}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label="Close draft"
      >
        <X className="w-6 h-6 text-white/80" />
      </button>

      {/* Center: Turn indicator + Timer */}
      <div className="flex flex-col items-center gap-1">
        {/* Turn Badge */}
        <div
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
            isYourTurn
              ? "bg-[#00d4aa] text-black shadow-[0_0_20px_rgba(0,212,170,0.4)]"
              : "bg-[#2d3142] text-white/80"
          )}
        >
          {isYourTurn ? "Your Turn" : currentTeamName}
        </div>

        {/* Timer */}
        {timerSeconds !== null && (
          <div
            className={cn(
              "flex items-center gap-2 text-2xl font-bold font-mono tracking-wider",
              isCriticalTime
                ? "text-red-500 animate-pulse"
                : isLowTime
                ? "text-yellow-400"
                : "text-white"
            )}
          >
            <Timer className="w-5 h-5" />
            {formatTime(timerSeconds)}
          </div>
        )}
      </div>

      {/* Right: Settings gear */}
      <button
        onClick={onSettingsClick}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-full transition-colors",
          autoDraftEnabled
            ? "bg-[#00d4aa]/20 text-[#00d4aa]"
            : "hover:bg-white/10 text-white/60"
        )}
        aria-label="Draft settings"
      >
        <Settings className="w-6 h-6" />
      </button>
    </div>
  );
}

