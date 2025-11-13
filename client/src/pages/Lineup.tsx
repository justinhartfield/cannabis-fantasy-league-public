import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Lock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import LineupEditor from "@/components/LineupEditor";
import ScoringBreakdown from "@/components/ScoringBreakdown";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Lineup() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const leagueId = parseInt(id!);

  const { data: league, isLoading: leagueLoading } = trpc.league.getById.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  const { data: myTeam, isLoading: teamLoading } = trpc.league.getMyTeam.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  // Get current year/week from league data (never hardcode this!)
  const currentYear = league?.seasonYear || 2025;
  const currentWeek = league?.currentWeek || 1;

  // Fetch weekly lineup
  const { data: weeklyLineup, isLoading: lineupLoading, refetch: refetchLineup } = trpc.lineup.getWeeklyLineup.useQuery(
    { teamId: myTeam?.id || 0, year: currentYear, week: currentWeek },
    { enabled: !!myTeam && !!league }
  );

  // Fetch roster
  const { data: roster, isLoading: rosterLoading } = trpc.roster.getMyRoster.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  // Fetch scoring breakdown
  const { data: scoringData, isLoading: scoringLoading } = trpc.scoring.getTeamBreakdown.useQuery(
    { teamId: myTeam?.id || 0, year: currentYear, week: currentWeek },
    { enabled: !!myTeam && !!league }
  );

  // Mutations
  const updateLineupMutation = trpc.lineup.updateLineup.useMutation({
    onSuccess: () => {
      toast.success("Lineup gespeichert!");
      refetchLineup();
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  const toggleLockMutation = trpc.lineup.toggleLock.useMutation({
    onSuccess: () => {
      toast.success("Lineup-Status geändert!");
      refetchLineup();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (authLoading || leagueLoading || teamLoading || lineupLoading || rosterLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!league || !myTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Liga oder Team nicht gefunden</h2>
          <Button onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/95 backdrop-blur-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/league/${leagueId}`)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to League
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gradient-primary">{league.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {myTeam.name} • Week {currentWeek}
                </p>
              </div>
            </div>
            {weeklyLineup?.isLocked && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border/50">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Lineup Locked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="lineup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/50 border border-border/50">
            <TabsTrigger value="lineup" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              Set Lineup
            </TabsTrigger>
            <TabsTrigger value="scoring" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              Scoring Breakdown
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="lineup">
            <LineupEditor
              teamId={myTeam.id}
              year={currentYear}
              week={currentWeek}
              lineup={weeklyLineup || null}
              roster={roster || []}
              isLocked={weeklyLineup?.isLocked || false}
              onUpdateLineup={(updates) => {
                updateLineupMutation.mutate({
                  teamId: myTeam.id,
                  year: currentYear,
                  week: currentWeek,
                  lineup: updates,
                });
              }}
              onLockLineup={() => {
                toggleLockMutation.mutate({
                  teamId: myTeam.id,
                  year: currentYear,
                  week: currentWeek,
                });
              }}
            />
          </TabsContent>
          
          <TabsContent value="scoring">
            {scoringData && scoringData.breakdowns && scoringData.breakdowns.length > 0 ? (
              <div className="grid gap-4 md:gap-6">
                {scoringData.breakdowns.map((breakdown: any, index: number) => (
                  <ScoringBreakdown
                    key={index}
                    data={{
                      assetName: breakdown.assetName || "Unknown",
                      assetType: breakdown.assetType,
                      components: breakdown.components || [],
                      bonuses: breakdown.bonuses || [],
                      penalties: breakdown.penalties || [],
                      subtotal: breakdown.subtotal || 0,
                      total: breakdown.totalPoints || 0,
                    }}
                    leagueAverage={breakdown.leagueAverage}
                    weeklyTrend={breakdown.weeklyTrend}
                  />
                ))}
              </div>
            ) : (
              <Card className="gradient-card border-border/50">
                <CardContent className="py-20 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-muted/30 mx-auto mb-4 flex items-center justify-center">
                      <Activity className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      No Scoring Data Yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Scoring data will be available after the week concludes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
