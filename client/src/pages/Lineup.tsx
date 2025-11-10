import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  
  // Get current week (for demo, using week 45 of 2025)
  const currentYear = 2025;
  const currentWeek = 45;

  const { data: league, isLoading: leagueLoading } = trpc.league.getById.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  const { data: myTeam, isLoading: teamLoading } = trpc.league.getMyTeam.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  // Fetch weekly lineup
  const { data: weeklyLineup, isLoading: lineupLoading, refetch: refetchLineup } = trpc.lineup.getWeeklyLineup.useQuery(
    { teamId: myTeam?.id || 0, year: currentYear, week: currentWeek },
    { enabled: !!myTeam }
  );

  // Fetch roster
  const { data: roster, isLoading: rosterLoading } = trpc.roster.getMyRoster.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  // Fetch scoring breakdown
  const { data: scoringData, isLoading: scoringLoading } = trpc.scoring.getTeamBreakdown.useQuery(
    { teamId: myTeam?.id || 0, year: currentYear, week: currentWeek },
    { enabled: !!myTeam }
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
    window.location.href = getLoginUrl();
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/league/${leagueId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück zur Liga
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{league.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Lineup - {myTeam.name} - Woche {currentWeek}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="lineup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="lineup">Lineup bearbeiten</TabsTrigger>
            <TabsTrigger value="scoring">Scoring-Übersicht</TabsTrigger>
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
              <div className="grid gap-6">
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
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Keine Scoring-Daten für diese Woche verfügbar.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Scoring-Daten werden nach Ablauf der Woche berechnet.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
