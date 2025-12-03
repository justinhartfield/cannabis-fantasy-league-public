/**
 * GamePhaseIndicator Component - DRAMATIC VIDEO GAME EDITION
 * 
 * High-impact visual display for game phases with:
 * - Animated gradient backgrounds
 * - Pulsing effects and glow
 * - Dramatic typography
 * - Video game-style countdown timer
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  team1Name?: string;
  team2Name?: string;
  leadingTeamName?: string;
  currentLead: number;
  winMarginRequired: number;
  minutesRemaining?: number;
}

interface GamePhaseIndicatorProps {
  data: GamePhaseData;
  overtimeData?: OvertimeData;
  className?: string;
}

function formatTimeRemaining(targetTime: Date): { hours: number; minutes: number; seconds: number; total: number } {
  const now = new Date();
  const diff = Math.max(0, targetTime.getTime() - now.getTime());
  
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    total: diff,
  };
}

export function GamePhaseIndicator({ data, overtimeData, className }: GamePhaseIndicatorProps) {
  const [time, setTime] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [pulse, setPulse] = useState(false);

  // Update timer every second
  useEffect(() => {
    const updateTimer = () => {
      let targetTime: Date | null = null;
      
      if (data.phase === 'overtime' && data.overtimeEndTime) {
        targetTime = new Date(data.overtimeEndTime);
      } else if (data.phase === 'halftime_window' && data.halftimeAt) {
        targetTime = new Date(new Date(data.halftimeAt).getTime() + 15 * 60 * 1000);
      } else if (data.phase === 'first_half' && data.halftimeAt) {
        targetTime = new Date(data.halftimeAt);
      } else if (data.phase === 'second_half' && data.endTime) {
        targetTime = new Date(data.endTime);
      }

      if (targetTime) {
        setTime(formatTimeRemaining(targetTime));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data]);

  // Pulse effect
  useEffect(() => {
    const pulseInterval = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(pulseInterval);
  }, []);

  const isUrgent = time.total < 5 * 60 * 1000; // Less than 5 minutes

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Game Clock */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl p-1",
        data.phase === 'overtime' 
          ? "bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient-x"
          : data.phase === 'halftime_window'
          ? "bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 animate-gradient-x"
          : data.isPowerHour
          ? "bg-gradient-to-r from-yellow-500 via-orange-400 to-yellow-500 animate-gradient-x"
          : "bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600"
      )}>
        <div className="relative bg-black/90 rounded-xl p-4 backdrop-blur">
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <div className="absolute w-32 h-32 -top-16 -left-16 bg-white/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute w-32 h-32 -bottom-16 -right-16 bg-white/5 rounded-full blur-3xl animate-pulse delay-500" />
          </div>

          <div className="relative flex items-center justify-between">
            {/* Phase Info */}
            <div className="flex items-center gap-4">
              {/* Animated Phase Icon */}
              <div className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center text-3xl",
                "shadow-lg transform transition-transform",
                pulse && "scale-105",
                data.phase === 'overtime' && "bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/50",
                data.phase === 'halftime_window' && "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/50",
                data.phase === 'first_half' && "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/50",
                data.phase === 'second_half' && "bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/50",
                data.phase === 'complete' && "bg-gradient-to-br from-gray-500 to-gray-600",
              )}>
                {data.phase === 'first_half' && '🏈'}
                {data.phase === 'halftime_window' && '🌿'}
                {data.phase === 'second_half' && '⚡'}
                {data.phase === 'overtime' && '🔥'}
                {data.phase === 'complete' && '🏆'}
              </div>

              <div>
                <div className={cn(
                  "text-2xl font-black uppercase tracking-wider",
                  data.phase === 'overtime' && "text-red-400",
                  data.phase === 'halftime_window' && "text-green-400",
                  data.phase === 'first_half' && "text-blue-400",
                  data.phase === 'second_half' && "text-purple-400",
                  data.phase === 'complete' && "text-gray-400",
                )}>
                  {data.phase === 'first_half' && '1ST HALF'}
                  {data.phase === 'halftime_window' && '⏸️ HALFTIME'}
                  {data.phase === 'second_half' && '2ND HALF'}
                  {data.phase === 'overtime' && '⚠️ OVERTIME'}
                  {data.phase === 'complete' && 'FINAL'}
                </div>
                <div className="text-white/60 text-sm">
                  {data.phase === 'first_half' && 'Halftime at 4:20 PM'}
                  {data.phase === 'halftime_window' && 'Make your substitutions!'}
                  {data.phase === 'second_half' && 'Push for the win!'}
                  {data.phase === 'overtime' && 'SUDDEN DEATH - First to 25pt lead wins!'}
                  {data.phase === 'complete' && 'Game Over'}
                </div>
              </div>
            </div>

            {/* Countdown Timer */}
            {data.phase !== 'complete' && (
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-white/40 mb-1">
                  {data.phase === 'overtime' ? 'OT REMAINING' : 'TIME LEFT'}
                </div>
                <div className={cn(
                  "font-mono font-black text-4xl tabular-nums tracking-tight",
                  isUrgent && "text-red-400 animate-pulse",
                  !isUrgent && data.phase === 'overtime' && "text-orange-400",
                  !isUrgent && data.phase !== 'overtime' && "text-white",
                )}>
                  {time.hours > 0 && (
                    <span>{time.hours.toString().padStart(2, '0')}:</span>
                  )}
                  <span>{time.minutes.toString().padStart(2, '0')}</span>
                  <span className={cn("text-white/50", pulse && "opacity-100", !pulse && "opacity-30")}>:</span>
                  <span>{time.seconds.toString().padStart(2, '0')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Power Hour Banner */}
      {data.isPowerHour && data.durationHours === 24 && (
        <div className="relative overflow-hidden rounded-2xl">
          {/* Animated fire background */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 animate-gradient-x" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz4KPC9zdmc+')] opacity-30" />
          
          <div className="relative p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl animate-bounce">🔥</div>
              <div>
                <div className="text-2xl font-black text-white uppercase tracking-wider drop-shadow-lg">
                  POWER HOUR ACTIVE!
                </div>
              <div className="text-yellow-100/80 text-sm">
                3:30 - 5:30 PM CET • All points doubled!
              </div>
              </div>
            </div>
            <div className={cn(
              "text-6xl font-black text-white drop-shadow-lg",
              pulse && "scale-110",
              "transition-transform duration-300"
            )}>
              2×
            </div>
          </div>
        </div>
      )}

      {/* Halftime Score Display */}
      {data.isHalftimePassed && data.halftimeScoreTeam1 !== null && data.halftimeScoreTeam2 !== null && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_70%)]" />
          <div className="relative p-4">
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-green-400/80 mb-2">
                ⏸️ HALFTIME SCORE ⏸️
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="text-4xl font-black text-white tabular-nums">
                  {data.halftimeScoreTeam1}
                </div>
                <div className="text-2xl text-green-400 font-bold">VS</div>
                <div className="text-4xl font-black text-white tabular-nums">
                  {data.halftimeScoreTeam2}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAMATIC OVERTIME DISPLAY */}
      {data.phase === 'overtime' && overtimeData && (
        <div className="relative overflow-hidden rounded-2xl">
          {/* Intense animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-orange-800 to-red-900 animate-gradient-x" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,100,0,0.3),transparent_50%)]" />
          
          {/* Lightning effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className={cn(
              "absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-yellow-400 via-transparent to-transparent",
              pulse && "opacity-100" , !pulse && "opacity-0",
              "transition-opacity duration-100"
            )} />
            <div className={cn(
              "absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-orange-400 via-transparent to-transparent",
              !pulse && "opacity-100", pulse && "opacity-0",
              "transition-opacity duration-100"
            )} />
          </div>

          <div className="relative p-6 space-y-4">
            {/* GOLDEN GOAL Header */}
            <div className="text-center">
              <div className={cn(
                "text-4xl font-black uppercase tracking-wider",
                "bg-gradient-to-r from-yellow-400 via-orange-300 to-yellow-400 bg-clip-text text-transparent",
                "drop-shadow-[0_0_20px_rgba(255,165,0,0.5)]",
                pulse && "scale-105",
                "transition-transform duration-300"
              )}>
                ⚡ GOLDEN GOAL ⚡
              </div>
              <div className="text-orange-200/80 text-sm mt-1">
                First team to gain {overtimeData.winMarginRequired}-point lead wins instantly!
              </div>
            </div>

            {/* Score Comparison */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-sm text-white/60 uppercase tracking-wider mb-1">
                  {overtimeData.team1Name || 'Team 1'}
                </div>
                <div className={cn(
                  "text-5xl font-black tabular-nums",
                  overtimeData.team1Score > overtimeData.team2Score ? "text-green-400" : "text-white"
                )}>
                  {overtimeData.team1Score}
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-3xl">⚔️</div>
                <div className={cn(
                  "text-lg font-bold mt-1",
                  overtimeData.currentLead >= overtimeData.winMarginRequired ? "text-green-400" : "text-orange-400"
                )}>
                  {overtimeData.currentLead > 0 ? `+${overtimeData.currentLead}` : 'TIED'}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-white/60 uppercase tracking-wider mb-1">
                  {overtimeData.team2Name || 'Team 2'}
                </div>
                <div className={cn(
                  "text-5xl font-black tabular-nums",
                  overtimeData.team2Score > overtimeData.team1Score ? "text-green-400" : "text-white"
                )}>
                  {overtimeData.team2Score}
                </div>
              </div>
            </div>

            {/* Progress to Victory */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/60">
                <span>Progress to Victory</span>
                <span>{Math.round((overtimeData.currentLead / overtimeData.winMarginRequired) * 100)}%</span>
              </div>
              <div className="relative h-6 rounded-full bg-black/50 overflow-hidden border border-orange-500/30">
                {/* Animated progress */}
                <div 
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                    "bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 animate-gradient-x",
                    overtimeData.currentLead >= overtimeData.winMarginRequired && "from-green-500 via-emerald-400 to-green-500"
                  )}
                  style={{ width: `${Math.min(100, (overtimeData.currentLead / overtimeData.winMarginRequired) * 100)}%` }}
                />
                {/* Glow effect */}
                <div 
                  className="absolute inset-y-0 left-0 rounded-full blur-sm bg-orange-400/50"
                  style={{ width: `${Math.min(100, (overtimeData.currentLead / overtimeData.winMarginRequired) * 100)}%` }}
                />
                {/* Threshold markers */}
                <div className="absolute inset-0 flex">
                  {[25, 50, 75].map(pct => (
                    <div key={pct} className="h-full border-r border-white/20" style={{ width: `${pct}%` }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>0</span>
                <span className="text-orange-400 font-bold">GOAL: {overtimeData.winMarginRequired}pt lead</span>
              </div>
            </div>

            {/* Leading Team Banner */}
            {overtimeData.leadingTeamName && overtimeData.currentLead > 0 && (
              <div className={cn(
                "text-center p-3 rounded-xl",
                "bg-gradient-to-r from-transparent via-green-500/20 to-transparent",
                "border border-green-500/30"
              )}>
                <span className="text-green-400 font-bold">
                  {overtimeData.leadingTeamName} leads by {overtimeData.currentLead} pts
                </span>
                {overtimeData.currentLead >= overtimeData.winMarginRequired && (
                  <div className="text-yellow-400 font-black text-xl mt-1 animate-pulse">
                    🎉 VICTORY! 🎉
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GamePhaseIndicator;
