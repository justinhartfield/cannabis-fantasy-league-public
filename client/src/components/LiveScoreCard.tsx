import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "./LiveIndicator";
import { TrendIndicator } from "./TrendIndicator";
import { Trophy } from "lucide-react";

interface Team {
  id: number;
  name: string;
  score: number;
  logo?: string;
}

interface LiveScoreCardProps {
  team1: Team;
  team2: Team;
  status: "scheduled" | "in_progress" | "final";
  week?: number;
  winnerId?: number;
  onClick?: () => void;
  className?: string;
}

export function LiveScoreCard({
  team1,
  team2,
  status,
  week,
  winnerId,
  onClick,
  className,
}: LiveScoreCardProps) {
  const isLive = status === "in_progress";
  const isFinal = status === "final";
  const isScheduled = status === "scheduled";

  const team1IsWinner = winnerId === team1.id;
  const team2IsWinner = winnerId === team2.id;

  return (
    <div
      className={cn(
        "gradient-card rounded-xl p-4 border border-border/50 transition-all",
        "card-hover-lift cursor-pointer",
        isLive && "live-border glow-primary",
        className
      )}
      onClick={onClick}
    >
      {/* Header - Week and Status */}
      <div className="flex items-center justify-between mb-4">
        {week && (
          <span className="text-xs text-muted-foreground font-medium">
            WEEK {week}
          </span>
        )}
        {isLive ? (
          <LiveIndicator size="sm" />
        ) : isFinal ? (
          <Badge variant="secondary" className="text-xs">
            FINAL
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            SCHEDULED
          </Badge>
        )}
      </div>

      {/* Matchup Display */}
      <div className="flex items-center justify-between gap-4">
        {/* Team 1 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {team1.logo && (
              <img
                src={team1.logo}
                alt={team1.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  "font-bold text-foreground truncate",
                  team1IsWinner && isFinal && "text-gradient-primary"
                )}
              >
                {team1.name}
              </h3>
              {team1IsWinner && isFinal && (
                <div className="flex items-center gap-1 text-xs text-[#FFD700]">
                  <Trophy className="w-3 h-3" />
                  Winner
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "text-3xl font-bold score-animate",
              team1IsWinner && isFinal ? "text-[#FF2D55]" : "text-foreground"
            )}
          >
            {team1.score}
          </div>
          <div className="text-xl font-bold text-muted-foreground">-</div>
          <div
            className={cn(
              "text-3xl font-bold score-animate",
              team2IsWinner && isFinal ? "text-[#FF2D55]" : "text-foreground"
            )}
          >
            {team2.score}
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  "font-bold text-foreground truncate",
                  team2IsWinner && isFinal && "text-gradient-primary"
                )}
              >
                {team2.name}
              </h3>
              {team2IsWinner && isFinal && (
                <div className="flex items-center justify-end gap-1 text-xs text-[#FFD700]">
                  <Trophy className="w-3 h-3" />
                  Winner
                </div>
              )}
            </div>
            {team2.logo && (
              <img
                src={team2.logo}
                alt={team2.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Live Updates Indicator */}
      {isLive && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] pulse-live" />
            Live updates
          </div>
        </div>
      )}
    </div>
  );
}

