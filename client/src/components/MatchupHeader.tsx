import { cn } from "@/lib/utils";
import { LiveIndicator } from "./LiveIndicator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchupHeaderProps {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  team1Logo?: string;
  team2Logo?: string;
  status: "scheduled" | "in_progress" | "final";
  week: number;
  year: number;
  onBack?: () => void;
  className?: string;
}

export function MatchupHeader({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  team1Logo,
  team2Logo,
  status,
  week,
  year,
  onBack,
  className,
}: MatchupHeaderProps) {
  const isLive = status === "in_progress";
  const isFinal = status === "final";

  return (
    <div className={cn("gradient-dark border-b border-border/50", className)}>
      <div className="container mx-auto px-4 py-6">
        {/* Back Button and Status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div className="text-sm text-muted-foreground">
              Week {week} • {year}
            </div>
          </div>
          {isLive ? (
            <LiveIndicator />
          ) : isFinal ? (
            <Badge variant="secondary">FINAL</Badge>
          ) : (
            <Badge variant="outline">SCHEDULED</Badge>
          )}
        </div>

        {/* Main Matchup Display */}
        <div className="flex items-center justify-center gap-8">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-3 flex-1 max-w-xs">
            {team1Logo ? (
              <img
                src={team1Logo}
                alt={team1Name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold">
                {team1Name.charAt(0)}
              </div>
            )}
            <h2 className="text-2xl font-bold text-center text-foreground">
              {team1Name}
            </h2>
          </div>

          {/* Score */}
          <div className="flex items-center gap-6">
            <div
              className={cn(
                "text-6xl font-bold score-animate",
                isLive && "text-gradient-primary"
              )}
            >
              {team1Score}
            </div>
            <div className="text-4xl font-bold text-muted-foreground">-</div>
            <div
              className={cn(
                "text-6xl font-bold score-animate",
                isLive && "text-gradient-secondary"
              )}
            >
              {team2Score}
            </div>
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-3 flex-1 max-w-xs">
            {team2Logo ? (
              <img
                src={team2Logo}
                alt={team2Name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold">
                {team2Name.charAt(0)}
              </div>
            )}
            <h2 className="text-2xl font-bold text-center text-foreground">
              {team2Name}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

