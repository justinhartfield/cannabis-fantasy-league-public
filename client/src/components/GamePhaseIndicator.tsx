/**
 * GamePhaseIndicator Component
 * 
 * Displays the current game phase for daily challenges:
 * - First Half (before halftime)
 * - Halftime Window (15 min for substitutions)
 * - Second Half (after halftime, before end)
 * - Power Hour (4:15-4:25 PM for 24h games)
 * - Overtime (Golden Goal sudden death)
 * - Complete
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Clock, 
  Zap, 
  Timer, 
  Trophy, 
  Target,
  Flame
} from "lucide-react";

export type GamePhase = 
  | 'first_half' 
  | 'halftime_window' 
  | 'second_half' 
  | 'overtime' 
  | 'complete';

export interface GamePhaseData {
  phase: GamePhase;
  halftimeAt?: string | null;
  endTime?: string | null;
  halftimeScoreTeam1?: number | null;
  halftimeScoreTeam2?: number | null;
  isHalftimePassed?: boolean;
  isInOvertime?: boolean;
  overtimeEndTime?: string | null;
  durationHours?: number;
  isPowerHour?: boolean;
  powerHourMultiplier?: number;
}

export interface OvertimeData {
  team1Score: number;
  team2Score: number;
  leadingTeamName?: string;
  currentLead: number;
  winMarginRequired: number; // 25 points
  minutesRemaining?: number;
}

interface GamePhaseIndicatorProps {
  data: GamePhaseData;
  overtimeData?: OvertimeData;
  className?: string;
}

function formatTimeRemaining(targetTime: Date): string {
  const now = new Date();
  const diff = targetTime.getTime() - now.getTime();
  
  if (diff <= 0) return "0:00";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function GamePhaseIndicator({ data, overtimeData, className }: GamePhaseIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [currentPhase, setCurrentPhase] = useState<GamePhase>(data.phase);

  // Update timer every second
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      
      if (data.phase === 'overtime' && data.overtimeEndTime) {
        setTimeRemaining(formatTimeRemaining(new Date(data.overtimeEndTime)));
      } else if (data.phase === 'halftime_window' && data.halftimeAt) {
        // Halftime window is 15 minutes after halftime
        const windowEnd = new Date(new Date(data.halftimeAt).getTime() + 15 * 60 * 1000);
        setTimeRemaining(formatTimeRemaining(windowEnd));
      } else if (data.phase === 'first_half' && data.halftimeAt) {
        setTimeRemaining(formatTimeRemaining(new Date(data.halftimeAt)));
      } else if (data.phase === 'second_half' && data.endTime) {
        setTimeRemaining(formatTimeRemaining(new Date(data.endTime)));
      }
      
      setCurrentPhase(data.phase);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data]);

  // Phase-specific styling
  const phaseConfig: Record<GamePhase, { 
    label: string; 
    icon: React.ReactNode; 
    bgColor: string; 
    textColor: string;
    description: string;
  }> = {
    first_half: {
      label: "1st Half",
      icon: <Clock className="w-4 h-4" />,
      bgColor: "bg-blue-500/20",
      textColor: "text-blue-400",
      description: "Game in progress"
    },
    halftime_window: {
      label: "HALFTIME",
      icon: <Timer className="w-4 h-4 animate-pulse" />,
      bgColor: "bg-green-500/30",
      textColor: "text-green-400",
      description: "Make your substitutions!"
    },
    second_half: {
      label: "2nd Half",
      icon: <Zap className="w-4 h-4" />,
      bgColor: "bg-orange-500/20",
      textColor: "text-orange-400",
      description: "Final stretch!"
    },
    overtime: {
      label: "OVERTIME",
      icon: <Target className="w-4 h-4 animate-pulse" />,
      bgColor: "bg-red-500/30",
      textColor: "text-red-400",
      description: "Golden Goal: First to 25pt lead wins!"
    },
    complete: {
      label: "FINAL",
      icon: <Trophy className="w-4 h-4" />,
      bgColor: "bg-gray-500/20",
      textColor: "text-gray-400",
      description: "Game complete"
    }
  };

  const config = phaseConfig[currentPhase];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Phase Badge */}
      <div className={cn(
        "flex items-center justify-between rounded-xl p-3 border",
        config.bgColor,
        "border-white/10"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", config.bgColor)}>
            {config.icon}
          </div>
          <div>
            <div className={cn("font-bold text-lg", config.textColor)}>
              {config.label}
            </div>
            <div className="text-xs text-white/60">{config.description}</div>
          </div>
        </div>
        
        {/* Timer */}
        {currentPhase !== 'complete' && timeRemaining && (
          <div className="text-right">
            <div className="text-xs text-white/40 uppercase">Time Left</div>
            <div className={cn("text-xl font-mono font-bold", config.textColor)}>
              {timeRemaining}
            </div>
          </div>
        )}
      </div>

      {/* Power Hour Indicator */}
      {data.isPowerHour && data.durationHours === 24 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
          <Flame className="w-5 h-5 text-yellow-400 animate-pulse" />
          <div className="flex-1">
            <span className="font-bold text-yellow-400">POWER HOUR ACTIVE!</span>
            <span className="text-white/60 text-sm ml-2">2x points for all scores</span>
          </div>
          <Badge className="bg-yellow-500/30 text-yellow-300 border-yellow-500/50">
            {data.powerHourMultiplier}x
          </Badge>
        </div>
      )}

      {/* Halftime Scores */}
      {data.isHalftimePassed && data.halftimeScoreTeam1 !== null && data.halftimeScoreTeam2 !== null && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 uppercase mb-2">Halftime Score</div>
          <div className="flex items-center justify-center gap-4 text-lg font-bold">
            <span className="text-white">{data.halftimeScoreTeam1}</span>
            <span className="text-white/30">-</span>
            <span className="text-white">{data.halftimeScoreTeam2}</span>
          </div>
        </div>
      )}

      {/* Overtime Golden Goal Meter */}
      {currentPhase === 'overtime' && overtimeData && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-red-400" />
              <span className="font-bold text-red-400">GOLDEN GOAL</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/40">Lead Required</div>
              <div className="font-bold text-white">{overtimeData.winMarginRequired} pts</div>
            </div>
          </div>
          
          {/* Progress toward Golden Goal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Current Lead: {overtimeData.currentLead} pts</span>
              {overtimeData.leadingTeamName && (
                <span className="text-white/80">{overtimeData.leadingTeamName}</span>
              )}
            </div>
            <Progress 
              value={(overtimeData.currentLead / overtimeData.winMarginRequired) * 100} 
              className="h-3 bg-white/10"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>0</span>
              <span>Goal: {overtimeData.winMarginRequired}pt lead</span>
            </div>
          </div>

          {/* OT Time Remaining */}
          {overtimeData.minutesRemaining !== undefined && (
            <div className="text-center pt-2 border-t border-white/10">
              <span className="text-white/60 text-sm">OT Time Remaining: </span>
              <span className="font-mono font-bold text-red-400">
                {overtimeData.minutesRemaining}m
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GamePhaseIndicator;

