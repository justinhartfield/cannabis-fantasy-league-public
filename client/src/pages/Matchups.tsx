import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { LiveScoreCard } from "@/components/LiveScoreCard";

/**
 * Matchups Page
 * 
 * Displays weekly head-to-head matchups for a league
 * Shows scores, winners, and upcoming games
 */

export default function Matchups() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [year, setYear] = useState(2025);
  const [week, setWeek] = useState(1);

  const { data: matchups, isLoading, refetch } = trpc.matchup.getWeekMatchups.useQuery({
    leagueId: Number(leagueId),
    year,
    week,
  });

  const { data: league } = trpc.league.getById.useQuery({ id: Number(leagueId) });

  const generateMatchups = trpc.matchup.generateWeekMatchups.useMutation({
    onSuccess: () => {
      toast.success("Matchups generated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateScores = trpc.matchup.updateMatchupScores.useMutation({
    onSuccess: () => {
      toast.success("Matchup scores updated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateMatchups = () => {
    generateMatchups.mutate({ leagueId: Number(leagueId), year, week });
  };

  const handleUpdateScores = () => {
    updateScores.mutate({ leagueId: Number(leagueId), year, week });
  };

  const [, setLocation] = useLocation();

  useEffect(() => {
    if (league?.leagueType === "challenge" && leagueId) {
      setLocation(`/challenge/${leagueId}`);
    }
  }, [league, leagueId, setLocation]);

  if (league?.leagueType === "challenge") {
    return null;
  }

  return (
    <div className="min-h-screen gradient-dark">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">SCORES</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {league?.name}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{matchups?.length || 0} games</span>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeek(Math.max(1, week - 1))}
              disabled={week <= 1}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[100px] bg-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>

              <div className="px-4 py-2 rounded-lg bg-card border border-border/50">
                <span className="text-xs text-muted-foreground mr-2">WEEK</span>
                <span className="text-lg font-bold text-foreground">{week}</span>
              </div>

              <Select value={week.toString()} onValueChange={(v) => setWeek(Number(v))}>
                <SelectTrigger className="w-[120px] bg-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeek(Math.min(18, week + 1))}
              disabled={week >= 18}
              className="text-muted-foreground hover:text-foreground"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              className="border-border/50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {league?.isCommissioner && (
              <>
                <Button 
                  onClick={handleGenerateMatchups}
                  disabled={generateMatchups.isLoading}
                  size="sm"
                  className="gradient-primary"
                >
                  {generateMatchups.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Matchups
                </Button>
                <Button 
                  onClick={handleUpdateScores}
                  disabled={updateScores.isLoading}
                  variant="outline"
                  size="sm"
                  className="border-border/50"
                >
                  {updateScores.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Scores
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">

        {/* Matchups List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading matchups...</p>
            </div>
          </div>
        ) : matchups && matchups.length > 0 ? (
          <div className="grid gap-4 md:gap-6">
            {matchups.map((matchup) => (
              <LiveScoreCard
                key={matchup.id}
                team1={{
                  id: matchup.team1Id,
                  name: matchup.team1?.name || 'Unknown Team',
                  score: matchup.team1Score || 0,
                }}
                team2={{
                  id: matchup.team2Id,
                  name: matchup.team2?.name || 'Unknown Team',
                  score: matchup.team2Score || 0,
                }}
                status={matchup.status as "scheduled" | "in_progress" | "final"}
                week={week}
                winnerId={matchup.winnerId || undefined}
                onClick={() => {
                  // Navigate to matchup detail view if needed
                  toast.info("Matchup details coming soon!");
                }}
                className="slide-in-bottom"
              />
            ))}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">No Matchups Yet</h3>
                <p className="text-muted-foreground mb-6">
                  There are no matchups scheduled for this week. 
                  {league?.isCommissioner && " Generate matchups to get started."}
                </p>
                {league?.isCommissioner && (
                  <Button onClick={handleGenerateMatchups} className="gradient-primary">
                    Generate Matchups
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
