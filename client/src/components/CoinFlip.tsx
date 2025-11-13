import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoinFlipProps {
  team1Name: string;
  team2Name: string;
  winnerTeamName: string | null;
}

export function CoinFlip({ team1Name, team2Name, winnerTeamName }: CoinFlipProps) {
  const [isFlipping, setIsFlipping] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    // Flip animation duration
    const flipTimer = setTimeout(() => {
      setIsFlipping(false);
      if (winnerTeamName) {
        setShowResult(true);
      }
    }, 2000);

    return () => clearTimeout(flipTimer);
  }, [winnerTeamName]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <Card className="max-w-2xl w-full mx-4 gradient-card border-border/50 glow-primary">
        <CardContent className="p-12 text-center space-y-8">
          {/* Title */}
          <div>
            <h2 className="text-3xl font-bold text-gradient-primary mb-2">
              Münzwurf
            </h2>
            <p className="text-muted-foreground">
              Wer darf zuerst draften?
            </p>
          </div>

          {/* Coin Animation */}
          <div className="flex justify-center py-8">
            <div
              className={cn(
                "relative w-32 h-32 flex items-center justify-center",
                isFlipping && "animate-coin-flip"
              )}
            >
              <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center glow-primary shadow-2xl">
                <Coins className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          {/* Team Names */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className={cn(
                "p-4 rounded-lg border transition-all duration-500",
                showResult && winnerTeamName === team1Name
                  ? "bg-primary/10 border-primary glow-primary scale-105"
                  : "bg-card/60 border-border/50"
              )}
            >
              <div className="text-lg font-bold text-foreground">{team1Name}</div>
              {showResult && winnerTeamName === team1Name && (
                <div className="flex items-center justify-center gap-1 mt-2 text-primary animate-fade-in">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-semibold">Draftet zuerst!</span>
                </div>
              )}
            </div>

            <div
              className={cn(
                "p-4 rounded-lg border transition-all duration-500",
                showResult && winnerTeamName === team2Name
                  ? "bg-primary/10 border-primary glow-primary scale-105"
                  : "bg-card/60 border-border/50"
              )}
            >
              <div className="text-lg font-bold text-foreground">{team2Name}</div>
              {showResult && winnerTeamName === team2Name && (
                <div className="flex items-center justify-center gap-1 mt-2 text-primary animate-fade-in">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-semibold">Draftet zuerst!</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {isFlipping ? (
            <p className="text-sm text-muted-foreground animate-pulse">
              Münze wird geworfen...
            </p>
          ) : showResult ? (
            <div className="space-y-2 animate-fade-in">
              <p className="text-lg font-semibold text-gradient-primary">
                {winnerTeamName} hat gewonnen!
              </p>
              <p className="text-sm text-muted-foreground">
                Weiterleitung zum Draft...
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

