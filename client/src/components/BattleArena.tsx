import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { FighterPicker, FIGHTER_ILLUSTRATIONS, getFighterByFile } from "@/components/FighterPicker";
import { AnimatedScoreCounter } from "@/components/AnimatedScoreCounter";
import { DamageFlash } from "@/components/DamageFlash";
import { ScoringPlayOverlay, ScoringPlayData } from "@/components/ScoringPlayOverlay";
import { BattleHealthBar } from "@/components/BattleHealthBar";
import { ComboCounter } from "@/components/ComboCounter";
import { Swords, Sparkles, Edit3 } from "lucide-react";

interface TeamData {
  teamId: number;
  teamName: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  fighterIllustration?: string | null;
  points: number;
}

interface BattleArenaProps {
  leftTeam: TeamData | null;
  rightTeam: TeamData | null;
  isLive?: boolean;
  challengeDate?: string;
  userTeamId?: number;
  selectedTeamId?: number | null;
  onFighterChange?: () => void;
  onTeamClick?: (teamId: number) => void;
  /** Optional: External scoring play to trigger battle animation */
  scoringPlay?: ScoringPlayData | null;
}

// Default fighter if none selected
const DEFAULT_FIGHTER = FIGHTER_ILLUSTRATIONS[0];

export function BattleArena({
  leftTeam,
  rightTeam,
  isLive = false,
  challengeDate,
  userTeamId,
  selectedTeamId,
  onFighterChange,
  onTeamClick,
  scoringPlay,
}: BattleArenaProps) {
  const [fighterPickerOpen, setFighterPickerOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  
  // Track previous scores for animation
  const prevLeftScoreRef = useRef<number>(leftTeam?.points ?? 0);
  const prevRightScoreRef = useRef<number>(rightTeam?.points ?? 0);
  const [leftPrevScore, setLeftPrevScore] = useState<number>(leftTeam?.points ?? 0);
  const [rightPrevScore, setRightPrevScore] = useState<number>(rightTeam?.points ?? 0);

  // Battle effect states
  const [activeScoringPlay, setActiveScoringPlay] = useState<ScoringPlayData | null>(null);
  const [damageFlashSide, setDamageFlashSide] = useState<"left" | "right" | null>(null);
  const [damageData, setDamageData] = useState<{ damage: number; playerName: string; playerType: string } | null>(null);
  const [leftFighterHit, setLeftFighterHit] = useState(false);
  const [rightFighterHit, setRightFighterHit] = useState(false);
  const [leftFighterAttacking, setLeftFighterAttacking] = useState(false);
  const [rightFighterAttacking, setRightFighterAttacking] = useState(false);
  
  // Combo tracking
  const [comboCount, setComboCount] = useState(0);
  const [comboTeamSide, setComboTeamSide] = useState<"left" | "right" | null>(null);
  const [isNewComboHit, setIsNewComboHit] = useState(false);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAttackerRef = useRef<number | null>(null);

  // Update previous scores when current scores change
  useEffect(() => {
    if (leftTeam?.points !== undefined && leftTeam.points !== prevLeftScoreRef.current) {
      setLeftPrevScore(prevLeftScoreRef.current);
      prevLeftScoreRef.current = leftTeam.points;
    }
  }, [leftTeam?.points]);

  useEffect(() => {
    if (rightTeam?.points !== undefined && rightTeam.points !== prevRightScoreRef.current) {
      setRightPrevScore(prevRightScoreRef.current);
      prevRightScoreRef.current = rightTeam.points;
    }
  }, [rightTeam?.points]);

  // Handle incoming scoring play
  useEffect(() => {
    if (!scoringPlay) return;

    const attackerIsLeft = scoringPlay.attackingTeamId === leftTeam?.teamId;
    const defenderSide = attackerIsLeft ? "right" : "left";

    // Update combo counter
    if (lastAttackerRef.current === scoringPlay.attackingTeamId) {
      // Same attacker - continue combo
      setComboCount((c) => c + 1);
      setIsNewComboHit(true);
    } else {
      // New attacker - reset combo
      setComboCount(1);
      setComboTeamSide(attackerIsLeft ? "left" : "right");
      setIsNewComboHit(true);
      lastAttackerRef.current = scoringPlay.attackingTeamId;
    }

    // Reset combo timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => {
      setComboCount(0);
      setComboTeamSide(null);
      lastAttackerRef.current = null;
    }, 5000);

    // Set active scoring play for overlay
    setActiveScoringPlay(scoringPlay);

    // Trigger attack animation
    if (attackerIsLeft) {
      setLeftFighterAttacking(true);
    } else {
      setRightFighterAttacking(true);
    }

    // Trigger damage flash after brief delay
    setTimeout(() => {
      setDamageFlashSide(defenderSide);
      setDamageData({
        damage: scoringPlay.pointsScored,
        playerName: scoringPlay.playerName,
        playerType: scoringPlay.playerType,
      });

      // Trigger hit animation on defender
      if (defenderSide === "left") {
        setLeftFighterHit(true);
      } else {
        setRightFighterHit(true);
      }
    }, 200);

    // Clear new hit flag after animation
    setTimeout(() => {
      setIsNewComboHit(false);
    }, 400);

  }, [scoringPlay, leftTeam?.teamId]);

  // Handle scoring play animation complete (internal cleanup)
  const handleScoringPlayComplete = useCallback(() => {
    setActiveScoringPlay(null);
    setLeftFighterAttacking(false);
    setRightFighterAttacking(false);
  }, []);

  // Handle damage flash complete
  const handleDamageFlashComplete = useCallback(() => {
    setDamageFlashSide(null);
    setDamageData(null);
    setLeftFighterHit(false);
    setRightFighterHit(false);
  }, []);

  const leftFighter = leftTeam?.fighterIllustration
    ? getFighterByFile(leftTeam.fighterIllustration)
    : DEFAULT_FIGHTER;
  const rightFighter = rightTeam?.fighterIllustration
    ? getFighterByFile(rightTeam.fighterIllustration)
    : FIGHTER_ILLUSTRATIONS[3]; // Default to a different fighter for variety

  const isUserTeam = (teamId: number | undefined) => teamId && teamId === userTeamId;

  const handleEditFighter = (teamId: number) => {
    setEditingTeamId(teamId);
    setFighterPickerOpen(true);
  };

  const handleFighterSelected = () => {
    setFighterPickerOpen(false);
    setEditingTeamId(null);
    onFighterChange?.();
  };

  return (
    <>
      {/* Battle Arena Hero Section */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#1a0a1f] via-[#0f0f16] to-[#050505] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Arena lights */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-[100px] animate-pulse delay-500" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), 
                              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />

          {/* Stadium floor gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#1f0f1f]/80 to-transparent" />
          
          {/* Radial spotlight */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-radial from-white/5 to-transparent rounded-full" />
        </div>

        {/* Battle Effect Overlays */}
        <ScoringPlayOverlay
          play={activeScoringPlay}
          leftTeamId={leftTeam?.teamId ?? 0}
          rightTeamId={rightTeam?.teamId ?? 0}
          onComplete={handleScoringPlayComplete}
        />

        <DamageFlash
          side={damageFlashSide || "right"}
          damage={damageData?.damage ?? 0}
          playerName={damageData?.playerName ?? ""}
          playerType={damageData?.playerType as any}
          isActive={damageFlashSide !== null}
          onComplete={handleDamageFlashComplete}
        />

        {/* Combo Counter */}
        <ComboCounter
          count={comboCount}
          teamSide={comboTeamSide}
          teamColor={comboTeamSide === "left" ? "#A3FF12" : "#FF5C47"}
          isNewHit={isNewComboHit}
        />

        {/* Content */}
        <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
          {/* Header with status */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">
                Daily Challenge
              </Badge>
              {isLive && <LiveIndicator size="sm" />}
            </div>
            {challengeDate && (
              <span className="text-xs text-white/50">{challengeDate}</span>
            )}
          </div>

          {/* Health Bars */}
          {leftTeam && rightTeam && (
            <div className="flex justify-between mb-4 px-2">
              <BattleHealthBar
                teamName={leftTeam.teamName}
                score={leftTeam.points}
                opponentScore={rightTeam.points}
                side="left"
                isHit={leftFighterHit}
              />
              <BattleHealthBar
                teamName={rightTeam.teamName}
                score={rightTeam.points}
                opponentScore={leftTeam.points}
                side="right"
                isHit={rightFighterHit}
              />
            </div>
          )}

          {/* Battle Layout */}
          <div className="flex items-center justify-between gap-4">
            {/* Left Fighter */}
            <div className="flex-1 flex flex-col items-center">
              <FighterCard
                team={leftTeam}
                fighter={leftFighter}
                side="left"
                isUserTeam={isUserTeam(leftTeam?.teamId)}
                isSelected={selectedTeamId === leftTeam?.teamId}
                onEditFighter={() => leftTeam && handleEditFighter(leftTeam.teamId)}
                onClick={leftTeam && onTeamClick ? () => onTeamClick(leftTeam.teamId) : undefined}
                isHit={leftFighterHit}
                isAttacking={leftFighterAttacking}
              />
            </div>

            {/* VS Badge */}
            <div className="flex flex-col items-center gap-2 px-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-secondary/50 blur-xl animate-pulse" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary via-yellow-400 to-secondary flex items-center justify-center shadow-2xl">
                  <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">VS</span>
            </div>

            {/* Right Fighter */}
            <div className="flex-1 flex flex-col items-center">
              <FighterCard
                team={rightTeam}
                fighter={rightFighter}
                side="right"
                isUserTeam={isUserTeam(rightTeam?.teamId)}
                isSelected={selectedTeamId === rightTeam?.teamId}
                onEditFighter={() => rightTeam && handleEditFighter(rightTeam.teamId)}
                onClick={rightTeam && onTeamClick ? () => onTeamClick(rightTeam.teamId) : undefined}
                isHit={rightFighterHit}
                isAttacking={rightFighterAttacking}
              />
            </div>
          </div>

          {/* Score Display with Animated Counters */}
          <div className="mt-6 flex items-center justify-center gap-4 sm:gap-8">
            <AnimatedScoreCounter
              value={leftTeam?.points ?? 0}
              previousValue={leftPrevScore}
              size="lg"
              label="Points"
              glowColor="#a3ff12"
              showParticles={true}
              showDelta={true}
              bigChangeThreshold={5}
            />
            
            <div className="text-2xl text-white/30">—</div>
            
            <AnimatedScoreCounter
              value={rightTeam?.points ?? 0}
              previousValue={rightPrevScore}
              size="lg"
              label="Points"
              glowColor="#ff5c47"
              showParticles={true}
              showDelta={true}
              bigChangeThreshold={5}
            />
          </div>

          {/* Score Bar */}
          <div className="mt-4 relative h-2 bg-white/10 rounded-full overflow-hidden">
            {leftTeam && rightTeam && (leftTeam.points > 0 || rightTeam.points > 0) && (
              <>
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                  style={{
                    width: `${
                      (leftTeam.points / (leftTeam.points + rightTeam.points)) * 100
                    }%`,
                  }}
                />
                <div
                  className="absolute top-0 right-0 h-full bg-gradient-to-l from-secondary to-secondary/70 transition-all duration-500"
                  style={{
                    width: `${
                      (rightTeam.points / (leftTeam.points + rightTeam.points)) * 100
                    }%`,
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fighter Picker Modal */}
      {editingTeamId && (
        <FighterPicker
          open={fighterPickerOpen}
          onOpenChange={setFighterPickerOpen}
          teamId={editingTeamId}
          currentFighter={
            editingTeamId === leftTeam?.teamId
              ? leftTeam.fighterIllustration
              : rightTeam?.fighterIllustration
          }
          onSelect={handleFighterSelected}
        />
      )}
    </>
  );
}

interface FighterCardProps {
  team: TeamData | null;
  fighter: typeof FIGHTER_ILLUSTRATIONS[number] | undefined;
  side: "left" | "right";
  isUserTeam?: boolean;
  isSelected?: boolean;
  onEditFighter?: () => void;
  onClick?: () => void;
  isHit?: boolean;
  isAttacking?: boolean;
}

function FighterCard({ 
  team, 
  fighter, 
  side, 
  isUserTeam, 
  isSelected, 
  onEditFighter, 
  onClick,
  isHit = false,
  isAttacking = false,
}: FighterCardProps) {
  if (!team) {
    return (
      <div className="w-full max-w-[160px] flex flex-col items-center opacity-50">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white/30" />
        </div>
        <span className="mt-3 text-sm text-white/50">Waiting...</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "w-full max-w-[160px] flex flex-col items-center transition-all duration-200",
        !isHit && !isAttacking && (side === "left" ? "animate-float-left" : "animate-float-right"),
        isSelected && "scale-105",
        onClick && "cursor-pointer hover:scale-105 active:scale-95"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      title={onClick ? "Click to view score breakdown" : undefined}
    >
      {/* Fighter Illustration */}
      <div className="relative group">
        {/* Selection ring */}
        {isSelected && (
          <div className={cn(
            "absolute -inset-2 rounded-full border-2 animate-pulse",
            side === "left" ? "border-primary" : "border-secondary"
          )} />
        )}
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-xl transition-opacity duration-200",
          isSelected ? "opacity-70" : "opacity-50",
          isHit ? "opacity-100 bg-red-500/50" : (side === "left" ? "bg-primary/30" : "bg-secondary/30")
        )} />
        
        {/* Fighter Image */}
        <div 
          className={cn(
            "relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center",
            isHit && "animate-fighter-hit",
            isAttacking && (side === "left" ? "animate-attack-lunge" : "animate-attack-lunge-left")
          )}
        >
          {fighter ? (
            <img
              src={`/assets/illustrations/${fighter.file}`}
              alt={fighter.name}
              className={cn(
                "w-full h-full object-contain drop-shadow-2xl transition-all duration-100",
                side === "right" && "-scale-x-100", // Mirror right fighter
                isHit && "brightness-150"
              )}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white/40" />
            </div>
          )}
        </div>

        {/* Edit Button (only for user's team) */}
        {isUserTeam && onEditFighter && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering team selection
              onEditFighter();
            }}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors group"
          >
            <Edit3 className="w-4 h-4 text-white/70 group-hover:text-white" />
          </button>
        )}
      </div>

      {/* Team Info */}
      <div className={cn(
        "mt-3 text-center transition-all duration-200 rounded-lg px-2 py-1",
        onClick && "hover:bg-white/10",
        isSelected && "bg-white/5"
      )}>
        <div className={cn(
          "font-bold text-sm sm:text-base truncate max-w-[140px] transition-colors",
          isSelected 
            ? (side === "left" ? "text-primary" : "text-secondary") 
            : "text-white"
        )}>
          {team.teamName}
        </div>
        {team.userName && (
          <div className={cn(
            "text-xs truncate max-w-[140px] transition-colors",
            isSelected ? "text-white/70" : "text-white/50"
          )}>
            @{team.userName}
          </div>
        )}
        {fighter && (
          <Badge 
            variant="outline" 
            className={cn(
              "mt-1 text-[10px] border-white/20",
              side === "left" ? "text-primary" : "text-secondary"
            )}
          >
            {fighter.name}
          </Badge>
        )}
      </div>
    </div>
  );
}
