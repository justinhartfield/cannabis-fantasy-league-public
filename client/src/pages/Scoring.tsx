import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScoringBreakdown from "@/components/ScoringBreakdown";
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  RefreshCw,
  BarChart3,
  UserCircle,
  Award,
  Zap
} from "@/lib/icons";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LeagueNav } from "@/components/LeagueNav";

interface TeamScore {
  teamId: number;
  teamName: string;
  points: number;
  rank?: number;
}

/**
 * Scoring Page
 * 
 * Displays:
 * - Weekly team scores and rankings
 * - Detailed scoring breakdowns for each team
 * - Real-time score updates via WebSocket
 * - Historical scoring trends
 */
export default function Scoring() {
  const { id } = useParams();
  const leagueId = parseInt(id!);
  const { user } = useAuth();
  
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [liveScores, setLiveScores] = useState<TeamScore[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch league data
  const { data: league } = trpc.league.getById.useQuery({ leagueId: leagueId });
  
  // Fetch team scores for selected week
  const { data: weekScores, refetch: refetchScores } = trpc.scoring.getLeagueWeekScores.useQuery({
    leagueId,
    year: selectedYear,
    week: selectedWeek,
  }, {
    enabled: !!leagueId,
  });

  // Fetch scoring breakdown for selected team
  const { data: breakdown } = trpc.scoring.getTeamBreakdown.useQuery({
    teamId: selectedTeamId!,
    year: selectedYear,
    week: selectedWeek,
  }, {
    enabled: !!selectedTeamId,
  });

  // Manual score calculation mutation (admin only)
  const calculateScoresMutation = trpc.scoring.calculateLeagueWeek.useMutation({
    onSuccess: () => {
      toast.success("Scores calculated successfully!");
      refetchScores();
      setIsCalculating(false);
    },
    onError: (error) => {
      toast.error(`Failed to calculate scores: ${error.message}`);
      setIsCalculating(false);
    },
  });

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    userId: user?.id || 0,
    leagueId,
    onMessage: (message) => {
      if (message.type === 'team_score_calculated') {
        // Update live scores as they come in
        setLiveScores((prev) => {
          const existing = prev.find((s) => s.teamId === message.teamId);
          if (existing) {
            return prev.map((s) =>
              s.teamId === message.teamId
                ? { ...s, points: message.points }
                : s
            );
          }
          return [...prev, {
            teamId: message.teamId,
            teamName: message.teamName,
            points: message.points,
          }];
        });

        toast.info(`${message.teamName} scored ${message.points} points!`, {
          duration: 3000,
        });
      } else if (message.type === 'scores_updated') {
        // Final scores update
        toast.success("All scores updated!", {
          duration: 5000,
        });
        refetchScores();
        setLiveScores([]);
      } else if (message.type === 'scoring_complete') {
        toast.success(`Scoring complete for Week ${message.week}!`);
        refetchScores();
      }
    },
  });

  // Calculate scores manually (admin only)
  const handleCalculateScores = () => {
    setIsCalculating(true);
    setLiveScores([]);
    calculateScoresMutation.mutate({
      leagueId,
      year: selectedYear,
      week: selectedWeek,
    });
  };

  // Merge live scores with fetched scores
  const displayScores = liveScores.length > 0 ? liveScores : weekScores || [];

  // Sort and rank teams
  const rankedScores = [...displayScores]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }));

  // Get current week number
  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  };

  useEffect(() => {
    setSelectedWeek(getCurrentWeek());
  }, []);

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Loading league...</p>
      </div>
    );
  }

  const userTeam = league.teams?.find((team: any) => team.userId === user?.id);
  const isCommissioner = league.commissionerUserId === user?.id;

  return (
    <div className="min-h-screen bg-background">
      <LeagueNav
        leagueId={leagueId}
        leagueName={league.name}
        teamCount={league.teams?.length || 0}
        maxTeams={league.maxTeams}
        isCommissioner={isCommissioner}
        hasTeam={!!userTeam}
        currentPage="scoring"
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                Scoring & Breakdowns
              </h1>
              <p className="text-muted-foreground mt-2">
                Weekly fantasy scores and detailed breakdowns
              </p>
            </div>
          
          {/* WebSocket Status */}
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
            
            {user?.role === 'admin' && (
              <Button
                onClick={handleCalculateScores}
                disabled={isCalculating}
                variant="outline"
                size="sm"
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Calculate Scores
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Week Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Week:</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => refetchScores()}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                {selectedYear} - Week {selectedWeek}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rankedScores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No scores yet for this week
                </p>
              ) : (
                <div className="space-y-2">
                  {rankedScores.map((score) => (
                    <button
                      key={score.teamId}
                      onClick={() => setSelectedTeamId(score.teamId)}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        selectedTeamId === score.teamId
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            score.rank === 1 ? 'bg-yellow-500 text-white' :
                            score.rank === 2 ? 'bg-gray-400 text-white' :
                            score.rank === 3 ? 'bg-orange-600 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {score.rank}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">
                              {score.teamName}
                            </div>
                            {isCalculating && liveScores.find(s => s.teamId === score.teamId) && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                <Zap className="w-3 h-3 mr-1" />
                                Live
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-foreground">
                            {score.points || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scoring Breakdown */}
        <div className="lg:col-span-2">
          {selectedTeamId && breakdown ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Scoring Breakdown
                  </CardTitle>
                  <CardDescription>
                    Detailed points breakdown for {rankedScores.find(s => s.teamId === selectedTeamId)?.teamName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="text-sm text-muted-foreground mb-1">Manufacturers</div>
                      <div className="text-2xl font-bold text-foreground">
                        {(breakdown.score.mfg1Points || 0) + (breakdown.score.mfg2Points || 0)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="text-sm text-muted-foreground mb-1">Strains</div>
                      <div className="text-2xl font-bold text-foreground">
                        {(breakdown.score.cstr1Points || 0) + (breakdown.score.cstr2Points || 0)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="text-sm text-muted-foreground mb-1">Products</div>
                      <div className="text-2xl font-bold text-foreground">
                        {(breakdown.score.prd1Points || 0) + (breakdown.score.prd2Points || 0)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="text-sm text-muted-foreground mb-1">Pharmacies</div>
                      <div className="text-2xl font-bold text-foreground">
                        {(breakdown.score.phm1Points || 0) + (breakdown.score.phm2Points || 0)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="text-sm text-muted-foreground mb-1">Brands</div>
                      <div className="text-2xl font-bold text-foreground">
                        {breakdown.score.brd1Points || 0}
                      </div>
                    </div>
                  </div>

                  {/* Individual Asset Breakdowns */}
                  <div className="space-y-4">
                    {breakdown.breakdowns.map((assetBreakdown: any, index: number) => (
                      <ScoringBreakdown
                        key={index}
                        data={{
                          assetName: assetBreakdown.assetName || `${assetBreakdown.assetType} #${assetBreakdown.assetId}`,
                          assetType: assetBreakdown.assetType,
                          components: assetBreakdown.breakdown?.components || [],
                          bonuses: assetBreakdown.breakdown?.bonuses || [],
                          penalties: assetBreakdown.breakdown?.penalties || [],
                          subtotal: assetBreakdown.breakdown?.subtotal || 0,
                          total: assetBreakdown.totalPoints || 0,
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a team to view detailed scoring breakdown</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
