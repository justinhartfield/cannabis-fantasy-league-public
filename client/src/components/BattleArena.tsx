import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveIndicator } from "@/components/LiveIndicator";
import { FighterPicker, FighterDisplay, FIGHTER_ILLUSTRATIONS, getFighterByFile } from "@/components/FighterPicker";
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
  onFighterChange?: () => void;
}

// Default fighter if none selected
const DEFAULT_FIGHTER = FIGHTER_ILLUSTRATIONS[0];

export function BattleArena({
  leftTeam,
  rightTeam,
  isLive = false,
  challengeDate,
  userTeamId,
  onFighterChange,
}: BattleArenaProps) {
  const [fighterPickerOpen, setFighterPickerOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);

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

          {/* Battle Layout */}
          <div className="flex items-center justify-between gap-4">
            {/* Left Fighter */}
            <div className="flex-1 flex flex-col items-center">
              <FighterCard
                team={leftTeam}
                fighter={leftFighter}
                side="left"
                isUserTeam={isUserTeam(leftTeam?.teamId)}
                onEditFighter={() => leftTeam && handleEditFighter(leftTeam.teamId)}
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
                onEditFighter={() => rightTeam && handleEditFighter(rightTeam.teamId)}
              />
            </div>
          </div>

          {/* Score Display */}
          <div className="mt-6 flex items-center justify-center gap-4 sm:gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                {leftTeam?.points?.toFixed(1) ?? "0.0"}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Points</div>
            </div>
            
            <div className="text-2xl text-white/30">—</div>
            
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                {rightTeam?.points?.toFixed(1) ?? "0.0"}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Points</div>
            </div>
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
  onEditFighter?: () => void;
}

function FighterCard({ team, fighter, side, isUserTeam, onEditFighter }: FighterCardProps) {
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
    <div className={cn(
      "w-full max-w-[160px] flex flex-col items-center",
      side === "left" ? "animate-float-left" : "animate-float-right"
    )}>
      {/* Fighter Illustration */}
      <div className="relative group">
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-xl opacity-50",
          side === "left" ? "bg-primary/30" : "bg-secondary/30"
        )} />
        
        {/* Fighter Image */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
          {fighter ? (
            <img
              src={`/assets/illustrations/${fighter.file}`}
              alt={fighter.name}
              className={cn(
                "w-full h-full object-contain drop-shadow-2xl",
                side === "right" && "-scale-x-100" // Mirror right fighter
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
            onClick={onEditFighter}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors group"
          >
            <Edit3 className="w-4 h-4 text-white/70 group-hover:text-white" />
          </button>
        )}
      </div>

      {/* Team Info */}
      <div className="mt-3 text-center">
        <div className="font-bold text-white text-sm sm:text-base truncate max-w-[140px]">
          {team.teamName}
        </div>
        {team.userName && (
          <div className="text-xs text-white/50 truncate max-w-[140px]">
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

