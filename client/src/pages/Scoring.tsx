import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScoringBreakdown from "@/components/ScoringBreakdown";
import { CategoryBarChart, TopPerformersPanel, PerformanceInsights, WeekOverWeekIndicator } from "@/components/ScoringEnhancements";
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
} from "lucide-react";
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
  const [assetSortBy, setAssetSortBy] = useState<'points' | 'name' | 'type'>('points');
  const [assetFilter, setAssetFilter] = useState<string>('all');

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
    <div className="min-h-screen gradient-dark">
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gradient-primary flex items-center gap-3">
                <BarChart3 className="w-9 h-9" />
                LEADERBOARD
              </h1>
              <p className="text-muted-foreground mt-2">
                Live scores and detailed performance breakdowns
              </p>
            </div>
          
          {/* WebSocket Status & Actions */}
          <div className="flex items-center gap-3">
            <Badge 
              variant={isConnected ? "default" : "secondary"} 
              className={`flex items-center gap-2 ${isConnected ? 'gradient-primary text-white' : 'bg-muted'}`}
            >
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white pulse-live' : 'bg-gray-400'}`} />
              {isConnected ? 'LIVE' : 'Offline'}
            </Badge>
            
            {user?.role === 'admin' && (
              <Button
                onClick={handleCalculateScores}
                disabled={isCalculating}
                variant="outline"
                size="sm"
                className="border-border/50"
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
      <Card className="mb-6 gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="w-5 h-5 text-[#FF2D55]" />
            Select Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-border/50 rounded-lg bg-card text-foreground"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Week:</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="px-4 py-2 border border-border/50 rounded-lg bg-card text-foreground"
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
              className="ml-auto border-border/50"
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
          <Card className="gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Award className="w-5 h-5 text-[#FFD700]" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                {selectedYear} - Week {selectedWeek}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rankedScores.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 mx-auto mb-4 flex items-center justify-center">
                    <Award className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No scores yet for this week
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rankedScores.map((score) => (
                    <button
                      key={score.teamId}
                      onClick={() => setSelectedTeamId(score.teamId)}
                      className={`w-full p-4 rounded-xl border transition-all card-hover-lift text-left ${
                        selectedTeamId === score.teamId
                          ? 'bg-primary/10 border-primary glow-primary'
                          : 'bg-card/50 border-border/50 hover:border-primary/30'
                      } ${score.rank === 1 ? 'winner-celebration' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                            score.rank === 1 ? 'rank-gold text-white' :
                            score.rank === 2 ? 'rank-silver text-white' :
                            score.rank === 3 ? 'rank-bronze text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {score.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold truncate ${
                              score.rank <= 3 ? 'text-gradient-primary' : 'text-foreground'
                            }`}>
                              {score.teamName}
                            </div>
                            {isCalculating && liveScores.find(s => s.teamId === score.teamId) && (
                              <Badge variant="secondary" className="text-xs mt-1 gradient-primary text-white">
                                <Zap className="w-3 h-3 mr-1" />
                                Live
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold score-animate ${
                            score.rank === 1 ? 'text-gradient-primary' : 'text-foreground'
                          }`}>
                            {score.points?.toFixed(1) || '0.0'}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">pts</div>
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

                  {/* Visual Enhancements */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <CategoryBarChart
                      categories={[
                        { name: 'Manufacturers', points: (breakdown.score.mfg1Points || 0) + (breakdown.score.mfg2Points || 0), color: 'bg-blue-500' },
                        { name: 'Strains', points: (breakdown.score.cstr1Points || 0) + (breakdown.score.cstr2Points || 0), color: 'bg-green-500' },
                        { name: 'Products', points: (breakdown.score.prd1Points || 0) + (breakdown.score.prd2Points || 0), color: 'bg-purple-500' },
                        { name: 'Pharmacies', points: (breakdown.score.phm1Points || 0) + (breakdown.score.phm2Points || 0), color: 'bg-orange-500' },
                        { name: 'Brands', points: breakdown.score.brd1Points || 0, color: 'bg-yellow-500' },
                      ]}
                      totalPoints={breakdown.score.totalPoints || 0}
                    />
                    <TopPerformersPanel
                      performers={breakdown.breakdowns
                        .map((b: any) => ({
                          assetName: b.assetName || `${b.assetType} #${b.assetId}`,
                          assetType: b.assetType,
                          points: b.totalPoints || 0,
                          category: b.assetType === 'manufacturer' ? 'Manufacturer' :
                                   b.assetType === 'cannabis_strain' ? 'Strain' :
                                   b.assetType === 'product' ? 'Product' :
                                   b.assetType === 'pharmacy' ? 'Pharmacy' : 'Brand',
                        }))
                        .sort((a: any, b: any) => b.points - a.points)
                      }
                    />
                  </div>

                  {/* Individual Asset Breakdowns */}
                  <div className="mb-4 flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Sort by:</label>
                      <select
                        value={assetSortBy}
                        onChange={(e) => setAssetSortBy(e.target.value as 'points' | 'name' | 'type')}
                        className="px-3 py-1.5 text-sm border rounded-md bg-background"
                      >
                        <option value="points">Points (High to Low)</option>
                        <option value="name">Name (A-Z)</option>
                        <option value="type">Type</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Filter:</label>
                      <select
                        value={assetFilter}
                        onChange={(e) => setAssetFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border rounded-md bg-background"
                      >
                        <option value="all">All Assets</option>
                        <option value="manufacturer">Manufacturers</option>
                        <option value="cannabis_strain">Strains</option>
                        <option value="product">Products</option>
                        <option value="pharmacy">Pharmacies</option>
                        <option value="brand">Brands</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {breakdown.breakdowns
                      .filter((b: any) => assetFilter === 'all' || b.assetType === assetFilter)
                      .sort((a: any, b: any) => {
                        if (assetSortBy === 'points') {
                          return (b.totalPoints || 0) - (a.totalPoints || 0);
                        } else if (assetSortBy === 'name') {
                          const nameA = a.assetName || `${a.assetType} #${a.assetId}`;
                          const nameB = b.assetName || `${b.assetType} #${b.assetId}`;
                          return nameA.localeCompare(nameB);
                        } else {
                          return a.assetType.localeCompare(b.assetType);
                        }
                      })
                      .map((assetBreakdown: any, index: number) => (
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
            <Card className="gradient-card border-border/50">
              <CardContent className="py-20">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-muted/30 mx-auto mb-6 flex items-center justify-center">
                    <UserCircle className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold text-foreground mb-2">
                    Select a Team
                  </p>
                  <p className="text-muted-foreground">
                    Choose a team from the leaderboard to view their detailed scoring breakdown
                  </p>
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
