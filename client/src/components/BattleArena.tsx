import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { FighterPicker, FIGHTER_ILLUSTRATIONS, getFighterByFile } from "@/components/FighterPicker";
import { BackgroundPicker, BATTLEFIELD_BACKGROUNDS, getBackgroundByFile, getRandomBackground } from "@/components/BackgroundPicker";
import { AnimatedScoreCounter } from "@/components/AnimatedScoreCounter";
import { DamageFlash } from "@/components/DamageFlash";
import { ScoringPlayOverlay, ScoringPlayData } from "@/components/ScoringPlayOverlay";
import { ComboCounter } from "@/components/ComboCounter";
import { useScorePrediction } from "@/hooks/useScorePrediction";
import { Swords, Sparkles, Edit3, Star, Image } from "lucide-react";

interface TeamData {
  teamId: number;
  teamName: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  fighterIllustration?: string | null;
  battlefieldBackground?: string | null;
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
  onBackgroundChange?: () => void;
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
  onBackgroundChange,
  onTeamClick,
  scoringPlay,
}: BattleArenaProps) {
  const [fighterPickerOpen, setFighterPickerOpen] = useState(false);
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  
  // Determine the current background - use user's team background or random default
  const currentBackground = useMemo(() => {
    // Check if user has a team and if it has a background set
    const userTeam = leftTeam?.teamId === userTeamId ? leftTeam : rightTeam?.teamId === userTeamId ? rightTeam : null;
    if (userTeam?.battlefieldBackground) {
      return getBackgroundByFile(userTeam.battlefieldBackground);
    }
    // Fall back to a random background seeded by the user's team ID for consistency
    return getRandomBackground(userTeamId);
  }, [leftTeam, rightTeam, userTeamId]);
  
  // Track previous scores for animation
  const prevLeftScoreRef = useRef<number>(leftTeam?.points ?? 0);
  const prevRightScoreRef = useRef<number>(rightTeam?.points ?? 0);
  const [leftPrevScore, setLeftPrevScore] = useState<number>(leftTeam?.points ?? 0);
  const [rightPrevScore, setRightPrevScore] = useState<number>(rightTeam?.points ?? 0);

  // Battle effect states
  const [activeScoringPlay, setActiveScoringPlay] = useState<ScoringPlayData | null>(null);
  const [damageFlashSide, setDamageFlashSide] = useState<"left" | "right" | null>(null);
  const [damageData, setDamageData] = useState<{ damage: number; playerName: string; playerType: string } | null>(null);
  
  // Enhanced fighter states for epic animations
  const [leftFighterHit, setLeftFighterHit] = useState(false);
  const [rightFighterHit, setRightFighterHit] = useState(false);
  const [leftFighterAttacking, setLeftFighterAttacking] = useState(false);
  const [rightFighterAttacking, setRightFighterAttacking] = useState(false);
  const [leftFighterDamaged, setLeftFighterDamaged] = useState(false);
  const [rightFighterDamaged, setRightFighterDamaged] = useState(false);
  const [leftFighterStunned, setLeftFighterStunned] = useState(false);
  const [rightFighterStunned, setRightFighterStunned] = useState(false);
  const [lastHitDamage, setLastHitDamage] = useState(0);
  
  // Combo tracking
  const [comboCount, setComboCount] = useState(0);
  const [comboTeamSide, setComboTeamSide] = useState<"left" | "right" | null>(null);
  const [isNewComboHit, setIsNewComboHit] = useState(false);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAttackerRef = useRef<number | null>(null);

  // Smooth score interpolation for live games
  const predictedLeftScore = useScorePrediction(leftTeam?.points ?? 0, isLive);
  const predictedRightScore = useScorePrediction(rightTeam?.points ?? 0, isLive);

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

  // Handle incoming scoring play - EXTENDED TIMINGS FOR EPIC EFFECT
  useEffect(() => {
    if (!scoringPlay) return;

    const attackerIsLeft = scoringPlay.attackingTeamId === leftTeam?.teamId;
    const defenderSide = attackerIsLeft ? "right" : "left";
    const isBigHit = scoringPlay.pointsScored >= 10;
    const isCriticalHit = scoringPlay.pointsScored >= 20;

    // Store damage for animation intensity
    setLastHitDamage(scoringPlay.pointsScored);

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
    }, 6000); // Extended timeout

    // Set active scoring play for overlay
    setActiveScoringPlay(scoringPlay);

    // Trigger attack animation - using epic lunge
    if (attackerIsLeft) {
      setLeftFighterAttacking(true);
    } else {
      setRightFighterAttacking(true);
    }

    // Trigger damage effects after attack lunge delay (extended from 200ms to 400ms)
    setTimeout(() => {
      setDamageFlashSide(defenderSide);
      setDamageData({
        damage: scoringPlay.pointsScored,
        playerName: scoringPlay.playerName,
        playerType: scoringPlay.playerType,
      });

      // Trigger knockback + hit animation on defender
      if (defenderSide === "left") {
        setLeftFighterHit(true);
        setLeftFighterDamaged(true);
        if (isBigHit) {
          setLeftFighterStunned(true);
        }
      } else {
        setRightFighterHit(true);
        setRightFighterDamaged(true);
        if (isBigHit) {
          setRightFighterStunned(true);
        }
      }
    }, 400);

    // Clear knockback animation (but keep damaged state) - extended from 400ms to 1200ms
    setTimeout(() => {
      if (defenderSide === "left") {
        setLeftFighterHit(false);
      } else {
        setRightFighterHit(false);
      }
    }, 1600);

    // Clear stunned state
    setTimeout(() => {
      setLeftFighterStunned(false);
      setRightFighterStunned(false);
    }, isCriticalHit ? 2500 : isBigHit ? 2000 : 1500);

    // Clear new hit flag after animation
    setTimeout(() => {
      setIsNewComboHit(false);
    }, 600);

  }, [scoringPlay, leftTeam?.teamId]);

  // Handle scoring play animation complete (internal cleanup) - extended timing
  const handleScoringPlayComplete = useCallback(() => {
    setActiveScoringPlay(null);
    setLeftFighterAttacking(false);
    setRightFighterAttacking(false);
  }, []);

  // Handle damage flash complete - extended timing
  const handleDamageFlashComplete = useCallback(() => {
    setDamageFlashSide(null);
    setDamageData(null);
    // Clear damaged state with a delay for sustained effect
    setTimeout(() => {
      setLeftFighterDamaged(false);
      setRightFighterDamaged(false);
    }, 500);
  }, []);

  const leftFighter = leftTeam?.fighterIllustration
    ? getFighterByFile(leftTeam.fighterIllustration)
    : DEFAULT_FIGHTER;
  const rightFighter = rightTeam?.fighterIllustration
    ? getFighterByFile(rightTeam.fighterIllustration)
    : FIGHTER_ILLUSTRATIONS[3]; // Default to a different fighter for variety

  const isUserTeam = (teamId: number | undefined): boolean => Boolean(teamId && teamId === userTeamId);

  const handleEditFighter = (teamId: number) => {
    setEditingTeamId(teamId);
    setFighterPickerOpen(true);
  };

  const handleFighterSelected = () => {
    setFighterPickerOpen(false);
    setEditingTeamId(null);
    onFighterChange?.();
  };

  const handleEditBackground = (teamId: number) => {
    setEditingTeamId(teamId);
    setBackgroundPickerOpen(true);
  };

  const handleBackgroundSelected = () => {
    setBackgroundPickerOpen(false);
    setEditingTeamId(null);
    onBackgroundChange?.();
  };

  return (
    <>
      {/* Battle Arena Hero Section */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#1a0a1f] via-[#0f0f16] to-[#050505] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
        {/* Custom Background Image */}
        {currentBackground && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={`/assets/illustrations/backgrounds/${currentBackground.file}`}
              alt={currentBackground.name}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            {/* Dark overlay for better contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
          </div>
        )}
        
        {/* Background Effects (overlay on top of custom background) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            <div className="flex items-center gap-3">
              {/* Background Edit Button (only for user's team) */}
              {userTeamId && (
                <button
                  onClick={() => handleEditBackground(userTeamId)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                  title="Change battlefield background"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Background</span>
                </button>
              )}
              {challengeDate && (
                <span className="text-xs text-white/50">{challengeDate}</span>
              )}
            </div>
          </div>

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
                isDamaged={leftFighterDamaged}
                isStunned={leftFighterStunned}
                damageAmount={lastHitDamage}
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
                isDamaged={rightFighterDamaged}
                isStunned={rightFighterStunned}
                damageAmount={lastHitDamage}
              />
            </div>
          </div>

          {/* Score Display with Animated Counters - Using predicted scores for smooth live updates */}
          <div className="mt-6 flex items-center justify-center gap-4 sm:gap-8">
            <AnimatedScoreCounter
              value={predictedLeftScore}
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
              value={predictedRightScore}
              previousValue={rightPrevScore}
              size="lg"
              label="Points"
              glowColor="#ff5c47"
              showParticles={true}
              showDelta={true}
              bigChangeThreshold={5}
            />
          </div>

          {/* Video Game Style Score Bars */}
          {leftTeam && rightTeam && (
            <div className="mt-6 flex justify-between gap-8">
              {/* Left Team Health Bar */}
              <ScoreHealthBar
                teamName={leftTeam.teamName}
                score={predictedLeftScore}
                opponentScore={predictedRightScore}
                side="left"
                isHit={leftFighterHit}
              />
              
              {/* Right Team Health Bar */}
              <ScoreHealthBar
                teamName={rightTeam.teamName}
                score={predictedRightScore}
                opponentScore={predictedLeftScore}
                side="right"
                isHit={rightFighterHit}
              />
            </div>
          )}
        </div>
      </div>

      {/* Fighter Picker Modal */}
      {editingTeamId && fighterPickerOpen && (
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

      {/* Background Picker Modal */}
      {editingTeamId && backgroundPickerOpen && (
        <BackgroundPicker
          open={backgroundPickerOpen}
          onOpenChange={setBackgroundPickerOpen}
          teamId={editingTeamId}
          currentBackground={
            editingTeamId === leftTeam?.teamId
              ? leftTeam.battlefieldBackground
              : rightTeam?.battlefieldBackground
          }
          onSelect={handleBackgroundSelected}
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
  isDamaged?: boolean;
  isStunned?: boolean;
  damageAmount?: number;
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
  isDamaged = false,
  isStunned = false,
  damageAmount = 0,
}: FighterCardProps) {
  const isBigHit = damageAmount >= 10;
  const isCriticalHit = damageAmount >= 20;

  if (!team) {
    return (
      <div className="w-full max-w-[180px] flex flex-col items-center opacity-50">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white/30" />
        </div>
        <span className="mt-3 text-sm text-white/50">Waiting...</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "w-full max-w-[180px] flex flex-col items-center transition-all duration-200",
        !isHit && !isAttacking && !isDamaged && (side === "left" ? "animate-float-left" : "animate-float-right"),
        isSelected && "scale-105",
        onClick && "cursor-pointer hover:scale-105 active:scale-95"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      title={onClick ? "Click to view score breakdown" : undefined}
    >
      {/* Fighter Illustration Container */}
      <div className="relative group">
        {/* Selection ring */}
        {isSelected && (
          <div className={cn(
            "absolute -inset-3 rounded-full border-2 animate-pulse",
            side === "left" ? "border-primary" : "border-secondary"
          )} />
        )}

        {/* Hurt vignette overlay when damaged */}
        {isDamaged && (
          <div 
            className="absolute -inset-4 rounded-full animate-hurt-vignette pointer-events-none z-20"
            style={{
              boxShadow: `inset 0 0 40px 15px rgba(255, 0, 0, 0.5)`,
            }}
          />
        )}

        {/* Glow effect - enhanced for damage states */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-xl transition-all duration-300",
          isSelected ? "opacity-70" : "opacity-50",
          isDamaged 
            ? "opacity-100 bg-red-500/60" 
            : isHit 
              ? "opacity-100 bg-red-500/50" 
              : (side === "left" ? "bg-primary/30" : "bg-secondary/30"),
          isCriticalHit && isDamaged && "animate-pulse"
        )} />

        {/* Stun stars indicator */}
        {isStunned && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 animate-stun-stars">
            <div className="flex gap-1">
              {[...Array(isCriticalHit ? 5 : 3)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "text-yellow-400 fill-yellow-400",
                    isCriticalHit ? "w-4 h-4" : "w-3 h-3"
                  )}
                  style={{
                    animationDelay: `${i * 100}ms`,
                    filter: "drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))",
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Fighter Image Container - LARGER SIZE */}
        <div 
          className={cn(
            "relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center",
            // Knockback animation (extended dramatic version)
            isHit && (side === "left" 
              ? "animate-fighter-knockback-left" 
              : "animate-fighter-knockback"
            ),
            // Epic attack lunge
            isAttacking && (side === "left" 
              ? "animate-attack-lunge-epic" 
              : "animate-attack-lunge-epic-left"
            ),
            // Sustained damaged flicker state
            isDamaged && !isHit && "animate-fighter-damaged"
          )}
        >
          {fighter ? (
            <img
              src={`/assets/illustrations/${fighter.file}`}
              alt={fighter.name}
              className={cn(
                "w-full h-full object-contain drop-shadow-2xl transition-all",
                side === "right" && "-scale-x-100", // Mirror right fighter
                // Enhanced damage visual filters
                isDamaged && "brightness-125 saturate-50 hue-rotate-[-20deg]",
                isHit && isCriticalHit && "brightness-200 saturate-0",
                isHit && !isCriticalHit && "brightness-175"
              )}
              style={{
                filter: isDamaged 
                  ? `brightness(1.25) saturate(0.5) sepia(0.3) hue-rotate(-20deg) drop-shadow(0 0 20px rgba(255,0,0,0.6))`
                  : undefined,
              }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white/40" />
            </div>
          )}

          {/* Impact flash overlay on fighter */}
          {isHit && (
            <div 
              className="absolute inset-0 bg-white/60 rounded-full animate-impact-mega-flash pointer-events-none"
            />
          )}
        </div>

        {/* Edit Button (only for user's team) */}
        {isUserTeam && onEditFighter && !isDamaged && (
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

        {/* Damage state indicator */}
        {isDamaged && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30">
            <div 
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                "bg-red-600/90 text-white animate-pulse"
              )}
              style={{
                boxShadow: "0 0 10px rgba(255, 0, 0, 0.6)",
              }}
            >
              {isCriticalHit ? "DEVASTATED!" : isBigHit ? "HURT!" : "HIT!"}
            </div>
          </div>
        )}
      </div>

      {/* Team Info */}
      <div className={cn(
        "mt-4 text-center transition-all duration-200 rounded-lg px-2 py-1",
        onClick && "hover:bg-white/10",
        isSelected && "bg-white/5",
        isDamaged && "opacity-80"
      )}>
        <div className={cn(
          "font-bold text-sm sm:text-base truncate max-w-[160px] transition-colors",
          isSelected 
            ? (side === "left" ? "text-primary" : "text-secondary") 
            : isDamaged
              ? "text-red-400"
              : "text-white"
        )}>
          {team.teamName}
        </div>
        {team.userName && (
          <div className={cn(
            "text-xs truncate max-w-[160px] transition-colors",
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
              isDamaged 
                ? "text-red-400 border-red-400/30"
                : side === "left" 
                  ? "text-primary" 
                  : "text-secondary"
            )}
          >
            {fighter.name}
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * ScoreHealthBar - Video game style health bar based on score ratio
 */
interface ScoreHealthBarProps {
  teamName: string;
  score: number;
  opponentScore: number;
  side: "left" | "right";
  isHit?: boolean;
}

function ScoreHealthBar({ teamName, score, opponentScore, side, isHit = false }: ScoreHealthBarProps) {
  const totalScore = score + opponentScore;
  // Health is based on your share of total points (50% = even, 100% = dominating, 0% = losing badly)
  const healthPercent = totalScore > 0 
    ? Math.max(5, Math.min(100, (score / totalScore) * 100))
    : 50;
  
  const isCritical = healthPercent <= 20;
  const isLow = healthPercent <= 35;
  const isDominating = healthPercent >= 65;

  return (
    <div
      className={cn(
        "flex-1 flex flex-col",
        side === "right" && "items-end"
      )}
    >
      {/* Critical warning - positioned above */}
      {isCritical && (
        <div className={cn(
          "text-red-500 text-sm font-black uppercase tracking-wider animate-pulse mb-1",
          side === "right" && "text-right"
        )}>
          DANGER!
        </div>
      )}

      {/* Team name */}
      <div
        className={cn(
          "text-sm font-bold uppercase tracking-wider mb-2",
          isCritical ? "text-red-400" : isLow ? "text-yellow-400" : "text-white/80"
        )}
      >
        {teamName}
      </div>

      {/* Health bar container */}
      <div
        className={cn(
          "relative h-5 w-full rounded-full overflow-hidden",
          "bg-black/60 border-2",
          isCritical 
            ? "border-red-500/60" 
            : isLow 
              ? "border-yellow-500/40" 
              : isDominating
                ? side === "left" ? "border-primary/50" : "border-secondary/50"
                : "border-white/20",
          isHit && "animate-health-shake",
          isCritical && "animate-health-critical"
        )}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />

        {/* Health fill */}
        <div
          className={cn(
            "absolute top-0 h-full transition-all duration-500 ease-out",
            side === "left" ? "left-0 rounded-r-full" : "right-0 rounded-l-full",
            isCritical
              ? "bg-gradient-to-r from-red-600 via-red-500 to-red-400"
              : isLow
                ? "bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400"
                : side === "left"
                  ? "bg-gradient-to-r from-primary/90 via-primary to-[#d4ff60]"
                  : "bg-gradient-to-r from-[#ff8066] via-secondary to-secondary/90"
          )}
          style={{
            width: `${healthPercent}%`,
            boxShadow: isCritical
              ? "0 0 20px rgba(239, 68, 68, 0.6), inset 0 2px 4px rgba(255,255,255,0.2)"
              : isLow
                ? "0 0 15px rgba(234, 179, 8, 0.5), inset 0 2px 4px rgba(255,255,255,0.2)"
                : side === "left"
                  ? "0 0 20px rgba(163, 255, 18, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)"
                  : "0 0 20px rgba(255, 92, 71, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)",
          }}
        >
          {/* Inner highlight/shine */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full" />
        </div>

        {/* Hit flash overlay */}
        {isHit && (
          <div className="absolute inset-0 bg-white animate-impact-flash" />
        )}
      </div>

      {/* Health percentage */}
      <div
        className={cn(
          "text-xs font-bold mt-1 tabular-nums",
          isCritical ? "text-red-400" : isLow ? "text-yellow-400" : "text-white/60",
          side === "right" && "text-right"
        )}
      >
        {Math.round(healthPercent)}%
      </div>
    </div>
  );
}
