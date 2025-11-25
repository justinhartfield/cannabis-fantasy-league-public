import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "./LiveIndicator";
import { TeamAvatar } from "./TeamAvatar";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TeamData {
  id: number;
  name: string;
  userName?: string | null;
  avatarUrl?: string | null;
  score: number;
  projectedScore?: number;
  record?: { wins: number; losses: number; ties: number };
  rank?: number;
  maxPF?: number;
  winProbability?: number;
  streak?: { type: "W" | "L" | "T"; count: number };
}

interface MatchupCardProps {
  team1: TeamData;
  team2: TeamData;
  week: number;
  status: "scheduled" | "in_progress" | "final";
  winnerId?: number;
  onClick?: () => void;
  className?: string;
}

export function MatchupCard({
  team1,
  team2,
  week,
  status,
  winnerId,
  onClick,
  className,
}: MatchupCardProps) {
  const isLive = status === "in_progress";
  const isFinal = status === "final";

  const team1IsWinner = winnerId === team1.id;
  const team2IsWinner = winnerId === team2.id;
  const team1IsLeading = team1.score > team2.score;
  const team2IsLeading = team2.score > team1.score;

  // Calculate score bar widths
  const totalScore = team1.score + team2.score;
  const team1Percentage = totalScore > 0 ? (team1.score / totalScore) * 100 : 50;
  const team2Percentage = totalScore > 0 ? (team2.score / totalScore) * 100 : 50;

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden transition-all cursor-pointer",
        "border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        isLive && "ring-2 ring-primary/50",
        className
      )}
      onClick={onClick}
    >
      {/* Main Card Content */}
      <div className="flex">
        {/* Team 1 Side (Left) */}
        <div
          className={cn(
            "flex-1 p-4 sm:p-5 bg-gradient-to-br",
            team1IsLeading || team1IsWinner
              ? "from-[#1a2a1a] via-[#0f1a0f] to-[#0a120a]"
              : "from-[#1a1520] via-[#12101a] to-[#0a0810]"
          )}
        >
          <TeamSide
            team={team1}
            side="left"
            isWinner={team1IsWinner}
            isLeading={team1IsLeading}
            isFinal={isFinal}
            isLive={isLive}
          />
        </div>

        {/* Center Divider with VS */}
        <div className="relative flex items-center justify-center w-16 sm:w-20 bg-gradient-to-b from-[#1a1520] to-[#0f0c14]">
          {/* Vertical line */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/10 -translate-x-1/2" />

          {/* VS Badge */}
          <div className="relative z-10 flex flex-col items-center gap-1">
            {(team1IsLeading || team2IsLeading) && !isFinal && (
              <Trophy
                className={cn(
                  "w-5 h-5",
                  team1IsLeading ? "text-primary" : "text-secondary"
                )}
              />
            )}
            {isFinal && (team1IsWinner || team2IsWinner) && (
              <Trophy className="w-5 h-5 text-yellow-400" />
            )}
            <span className="text-xs font-bold text-white/60">VS</span>
          </div>
        </div>

        {/* Team 2 Side (Right) */}
        <div
          className={cn(
            "flex-1 p-4 sm:p-5 bg-gradient-to-bl",
            team2IsLeading || team2IsWinner
              ? "from-[#1a2a1a] via-[#0f1a0f] to-[#0a120a]"
              : "from-[#1a1520] via-[#12101a] to-[#0a0810]"
          )}
        >
          <TeamSide
            team={team2}
            side="right"
            isWinner={team2IsWinner}
            isLeading={team2IsLeading}
            isFinal={isFinal}
            isLive={isLive}
          />
        </div>
      </div>

      {/* Score Comparison Bar */}
      <div className="h-1.5 flex bg-white/5">
        <div
          className={cn(
            "h-full transition-all duration-500",
            team1IsLeading || team1IsWinner
              ? "bg-gradient-to-r from-primary to-primary/70"
              : "bg-white/20"
          )}
          style={{ width: `${team1Percentage}%` }}
        />
        <div
          className={cn(
            "h-full transition-all duration-500",
            team2IsLeading || team2IsWinner
              ? "bg-gradient-to-l from-secondary to-secondary/70"
              : "bg-white/20"
          )}
          style={{ width: `${team2Percentage}%` }}
        />
      </div>

      {/* Status Badge - Top Right */}
      <div className="absolute top-3 right-3 z-10">
        {isLive ? (
          <LiveIndicator size="sm" />
        ) : isFinal ? (
          <Badge className="bg-white/10 text-white/80 border-white/20 text-[10px]">
            FINAL
          </Badge>
        ) : (
          <Badge variant="outline" className="border-white/20 text-white/60 text-[10px]">
            WEEK {week}
          </Badge>
        )}
      </div>

      {/* Max PF Stats */}
      {(team1.maxPF !== undefined || team2.maxPF !== undefined) && (
        <div className="flex justify-between px-4 py-2 bg-black/30 text-[10px] text-white/40">
          <span>Max PF: {team1.maxPF?.toFixed(1) ?? "-"}</span>
          <span>Max PF: {team2.maxPF?.toFixed(1) ?? "-"}</span>
        </div>
      )}
    </div>
  );
}

interface TeamSideProps {
  team: TeamData;
  side: "left" | "right";
  isWinner: boolean;
  isLeading: boolean;
  isFinal: boolean;
  isLive: boolean;
}

function TeamSide({ team, side, isWinner, isLeading, isFinal, isLive }: TeamSideProps) {
  const isRight = side === "right";

  // Format record string
  const recordString = team.record
    ? `${team.record.wins}-${team.record.losses}${team.record.ties > 0 ? `-${team.record.ties}` : ""}`
    : null;

  // Get trend icon
  const TrendIcon =
    team.streak?.type === "W"
      ? TrendingUp
      : team.streak?.type === "L"
      ? TrendingDown
      : Minus;

  return (
    <div className={cn("flex flex-col gap-3", isRight && "items-end")}>
      {/* Avatar and Badges Row */}
      <div className={cn("flex items-start gap-3", isRight && "flex-row-reverse")}>
        {/* Avatar with Ring */}
        <div className="relative">
          <div
            className={cn(
              "rounded-full p-0.5",
              isWinner
                ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                : isLeading
                ? "bg-gradient-to-br from-primary to-primary/60"
                : "bg-white/20"
            )}
          >
            <TeamAvatar
              avatarUrl={team.avatarUrl}
              teamName={team.name}
              size="lg"
              className="border-2 border-black"
            />
          </div>

          {/* Win Probability Badge */}
          {team.winProbability !== undefined && (
            <div
              className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold",
                team.winProbability >= 50
                  ? "bg-primary text-black"
                  : "bg-white/20 text-white/70"
              )}
            >
              {team.winProbability}%
            </div>
          )}
        </div>

        {/* Badges Column */}
        <div className={cn("flex flex-col gap-1", isRight && "items-end")}>
          {/* Record and Rank */}
          {(recordString || team.rank) && (
            <div className="flex items-center gap-1.5 text-[11px] text-white/60">
              {recordString && <span>{recordString}</span>}
              {team.rank && (
                <span className="text-white/40">[#{team.rank}]</span>
              )}
            </div>
          )}

          {/* Streak Badge */}
          {team.streak && team.streak.count > 0 && (
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                team.streak.type === "W"
                  ? "bg-green-500/20 text-green-400"
                  : team.streak.type === "L"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-white/10 text-white/50"
              )}
            >
              <TrendIcon className="w-3 h-3" />
              <span>
                {team.streak.count}
                {team.streak.type}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Score Display */}
      <div className={cn("flex flex-col", isRight && "items-end")}>
        <div
          className={cn(
            "text-3xl sm:text-4xl font-black tabular-nums",
            isWinner && isFinal
              ? "text-yellow-400"
              : isLeading
              ? "text-primary"
              : "text-white"
          )}
        >
          {team.score.toFixed(1)}
        </div>
        {team.projectedScore !== undefined && (
          <div className="text-[11px] text-white/40">
            Proj: {team.projectedScore.toFixed(1)}
          </div>
        )}
      </div>

      {/* Team Name and Username */}
      <div className={cn("flex flex-col", isRight && "items-end")}>
        <div
          className={cn(
            "font-bold text-sm sm:text-base truncate max-w-[120px] sm:max-w-[160px]",
            isWinner ? "text-yellow-400" : isLeading ? "text-primary" : "text-white"
          )}
        >
          {team.name}
        </div>
        {team.userName && (
          <div className="text-[11px] text-white/50 truncate max-w-[120px] sm:max-w-[160px]">
            @{team.userName}
          </div>
        )}
      </div>

      {/* Winner Badge */}
      {isWinner && isFinal && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-semibold text-yellow-400",
            isRight && "justify-end"
          )}
        >
          <Trophy className="w-4 h-4" />
          <span>Winner</span>
        </div>
      )}
    </div>
  );
}

