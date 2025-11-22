     1|import { useState, useEffect } from "react";
     2|import { useParams, useLocation } from "wouter";
     3|import { trpc } from "@/lib/trpc";
     4|import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
     5|import { Button } from "@/components/ui/button";
     6|import { Badge } from "@/components/ui/badge";
     7|import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
     8|import ScoringBreakdown from "@/components/ScoringBreakdownV2";
     9|import { CategoryBarChart, TopPerformersPanel, PerformanceInsights, WeekOverWeekIndicator, WeekProgressBar } from "@/components/ScoringEnhancements";
    10|import { 
    11|  Trophy, 
    12|  TrendingUp, 
    13|  TrendingDown, 
    14|  Calendar, 
    15|  RefreshCw,
    16|  BarChart3,
    17|  UserCircle,
    18|  Award,
    19|  Zap,
    20|  Clock
    21|} from "lucide-react";
    22|import { toast } from "sonner";
    23|import { useAuth } from "@/_core/hooks/useAuth";
    24|import { useWebSocket } from "@/hooks/useWebSocket";
    25|import { LeagueNav } from "@/components/LeagueNav";
    26|
    27|interface TeamScore {
    28|  teamId: number;
    29|  teamName: string;
    30|  points: number;
    31|  rank?: number;
    32|}
    33|
    34|/**
    35| * Scoring Page
    36| * 
    37| * Displays:
    38| * - Weekly team scores and rankings
    39| * - Detailed scoring breakdowns for each team
    40| * - Real-time score updates via WebSocket
    41| * - Historical scoring trends
    42| */
    43|export default function Scoring() {
    44|  const { id } = useParams();
    45|  const [, setLocation] = useLocation();
    46|  const leagueId = parseInt(id!);
    47|  const { user } = useAuth();
    48|  
    49|  const [selectedWeek, setSelectedWeek] = useState<number>(1);
    50|  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    51|  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    52|  const [liveScores, setLiveScores] = useState<TeamScore[]>([]);
    53|  const [isCalculating, setIsCalculating] = useState(false);
    54|  const [assetSortBy, setAssetSortBy] = useState<'points' | 'name' | 'type'>('points');
    55|  const [assetFilter, setAssetFilter] = useState<string>('all');
    56|  const [defaultsApplied, setDefaultsApplied] = useState(false);
    57|
    58|  // Fetch league data
    59|  const { data: league } = trpc.league.getById.useQuery({ leagueId: leagueId });
    60|
    61|  useEffect(() => {
    62|    if (league?.leagueType === "challenge") {
    63|      setLocation(`/challenge/${leagueId}`);
    64|    }
    65|  }, [league, leagueId, setLocation]);
    66|
    67|  useEffect(() => {
    68|    if (!league || defaultsApplied) {
    69|      return;
    70|    }
    71|
    72|    const fallbackYear = new Date().getFullYear();
    73|    const defaultYear = league.seasonYear || fallbackYear;
    74|    const defaultWeek = Math.max(1, (league.currentWeek ?? 1) - 1);
    75|
    76|    setSelectedYear(defaultYear);
    77|    setSelectedWeek(defaultWeek);
    78|    setDefaultsApplied(true);
    79|  }, [league, defaultsApplied]);
    80|
    81|  // Auto-calculate scores if data is missing and user is admin/commissioner
    82|  const { mutate: calculateScores } = calculateScoresMutation;
    83|  
    84|  useEffect(() => {
    85|    if (
    86|      !isCalculating &&
    87|      !isRefetching &&
    88|      weekScores &&
    89|      weekScores.every(s => s.points === 0) &&
    90|      (user?.role === 'admin' || isCommissioner)
    91|    ) {
    92|      console.log("Auto-triggering score calculation for empty week...");
    93|      calculateScores({
    94|        leagueId,
    95|        year: selectedYear,
    96|        week: selectedWeek,
    97|      });
    98|    }
    99|  }, [
   100|    weekScores, 
   101|    isCalculating, 
   102|    isRefetching, 
   103|    user?.role, 
   104|    isCommissioner, 
   105|    calculateScores, 
   106|    leagueId, 
   107|    selectedYear, 
   108|    selectedWeek
   109|  ]);
   110|  
   111|  // Fetch team scores for selected week
   112|  const { data: weekScores, refetch: refetchScores, isRefetching } = trpc.scoring.getLeagueWeekScores.useQuery({
   113|    leagueId,
   114|    year: selectedYear,
   115|    week: selectedWeek,
   116|  }, {
   117|    enabled: !!leagueId,
   118|  });
   119|
   120|  // NEW: Fetch LIVE cumulative scores for the current week
   121|  const { data: cumulativeLiveScores, isLoading: isLoadingLive } = trpc.scoring.getLeagueLiveScores.useQuery({
   122|    leagueId,
   123|    year: selectedYear,
   124|    week: selectedWeek,
   125|  }, {
   126|    enabled: !!leagueId && !!weekScores && weekScores.every(s => s.points === 0),
   127|    refetchInterval: 60000, // Refresh every minute
   128|  });
   129|
   130|  // Fetch scoring breakdown for selected team
   131|  const { data: breakdown } = trpc.scoring.getTeamBreakdown.useQuery({
   132|    teamId: selectedTeamId!,
   133|    year: selectedYear,
   134|    week: selectedWeek,
   135|  }, {
   136|    enabled: !!selectedTeamId,
   137|  });
   138|
   139|  // Manual score calculation mutation (admin only)
   140|  const calculateScoresMutation = trpc.scoring.calculateLeagueWeek.useMutation({
   141|    onSuccess: () => {
   142|      toast.success("Scores calculated successfully!");
   143|      refetchScores();
   144|      setIsCalculating(false);
   145|    },
   146|    onError: (error) => {
   147|      toast.error(`Failed to calculate scores: ${error.message}`);
   148|      setIsCalculating(false);
   149|    },
   150|  });
   151|
   152|  // WebSocket for real-time updates
   153|  const { isConnected } = useWebSocket({
   154|    userId: user?.id || 0,
   155|    leagueId,
   156|    onMessage: (message) => {
   157|      if (message.type === 'team_score_calculated') {
   158|        // Update live scores as they come in
   159|        setLiveScores((prev) => {
   160|          const existing = prev.find((s) => s.teamId === message.teamId);
   161|          if (existing) {
   162|            return prev.map((s) =>
   163|              s.teamId === message.teamId
   164|                ? { ...s, points: message.points }
   165|                : s
   166|            );
   167|          }
   168|          return [...prev, {
   169|            teamId: message.teamId,
   170|            teamName: message.teamName,
   171|            points: message.points,
   172|          }];
   173|        });
   174|
   175|        toast.info(`${message.teamName} scored ${message.points} points!`, {
   176|          duration: 3000,
   177|        });
   178|      } else if (message.type === 'scores_updated') {
   179|        // Final scores update
   180|        toast.success("All scores updated!", {
   181|          duration: 5000,
   182|        });
   183|        refetchScores();
   184|        setLiveScores([]);
   185|      } else if (message.type === 'scoring_complete') {
   186|        toast.success(`Scoring complete for Week ${message.week}!`);
   187|        refetchScores();
   188|      }
   189|    },
   190|  });
   191|
   192|  // Calculate scores manually (admin only)
   193|  const handleCalculateScores = () => {
   194|    setIsCalculating(true);
   195|    setLiveScores([]);
   196|    calculateScoresMutation.mutate({
   197|      leagueId,
   198|      year: selectedYear,
   199|      week: selectedWeek,
   200|    });
   201|  };
   202|
   203|  // Merge live scores with fetched scores
   204|  // Prioritize:
   205|  // 1. Real-time WebSocket updates (liveScores)
   206|  // 2. Cumulative live calculation (cumulativeLiveScores) - if official scores are 0
   207|  // 3. Official weekly scores (weekScores)
   208|  const useLiveCalculation = weekScores && weekScores.every(s => s.points === 0) && cumulativeLiveScores && cumulativeLiveScores.some(s => s.points > 0);
   209|  
   210|  const displayScores = liveScores.length > 0 
   211|    ? liveScores 
   212|    : useLiveCalculation 
   213|      ? cumulativeLiveScores 
   214|      : weekScores || [];
   215|
   216|  // Sort and rank teams
   217|  const rankedScores = [...displayScores]
   218|    .sort((a, b) => (b.points || 0) - (a.points || 0))
   219|    .map((score, index) => ({
   220|      ...score,
   221|      rank: index + 1,
   222|    }));
   223|
   224|  if (!league) {
   225|    return (
   226|      <div className="container mx-auto px-4 py-8">
   227|        <p className="text-center text-muted-foreground">Loading league...</p>
   228|      </div>
   229|    );
   230|  }
   231|
   232|  if (league.leagueType === "challenge") {
   233|    return null;
   234|  }
   235|
   236|  const userTeam = league.teams?.find((team: any) => team.userId === user?.id);
   237|  const isCommissioner = league.commissionerUserId === user?.id;
   238|
   239|  return (
   240|    <div className="min-h-screen gradient-dark">
   241|      <LeagueNav
   242|        leagueId={leagueId}
   243|        leagueName={league.name}
   244|        teamCount={league.teams?.length || 0}
   245|        maxTeams={league.maxTeams}
   246|        leagueType={league.leagueType}
   247|        isCommissioner={isCommissioner}
   248|        hasTeam={!!userTeam}
   249|        currentPage="scoring"
   250|      />
   251|      
   252|      <div className="container mx-auto px-4 py-8">
   253|        {/* Header */}
   254|        <div className="mb-8">
   255|          <div className="flex items-center justify-between flex-wrap gap-4">
   256|            <div>
   257|              <h1 className="text-4xl font-bold text-gradient-primary flex items-center gap-3">
   258|                <BarChart3 className="w-9 h-9" />
   259|                LEADERBOARD
   260|              </h1>
   261|              <p className="text-muted-foreground mt-2">
   262|                Live scores and detailed performance breakdowns
   263|              </p>
   264|            </div>
   265|          
   266|          {/* WebSocket Status & Actions */}
   267|          <div className="flex items-center gap-3">
   268|            <Badge 
   269|              variant={isConnected ? "default" : "secondary"} 
   270|              className={`flex items-center gap-2 ${isConnected ? 'gradient-primary text-white' : 'bg-muted'}`}
   271|            >
   272|              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white pulse-live' : 'bg-gray-400'}`} />
   273|              {isConnected ? 'LIVE' : 'Offline'}
   274|            </Badge>
   275|            
   276|            {/* Progress Bar */}
   277|            <div className="w-full lg:w-auto min-w-[250px]">
   278|              <WeekProgressBar year={selectedYear} week={selectedWeek} />
   279|            </div>
   280|
   281|            {user?.role === 'admin' && (
   282|              <Button
   283|                onClick={handleCalculateScores}
   284|                disabled={isCalculating}
   285|                variant="outline"
   286|                size="sm"
   287|                className="border-border/50"
   288|              >
   289|                {isCalculating ? (
   290|                  <>
   291|                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
   292|                    Calculating...
   293|                  </>
   294|                ) : (
   295|                  <>
   296|                    <Zap className="w-4 h-4 mr-2" />
   297|                    Calculate Scores
   298|                  </>
   299|                )}
   300|              </Button>
   301|            )}
   302|          </div>
   303|        </div>
   304|      </div>
   305|
   306|      {/* Week Selector */}
   307|      <Card className="mb-6 gradient-card border-border/50">
   308|        <CardHeader>
   309|          <CardTitle className="flex items-center gap-2 text-foreground">
   310|            <Calendar className="w-5 h-5 text-[#FF2D55]" />
   311|            Select Week
   312|          </CardTitle>
   313|        </CardHeader>
   314|        <CardContent>
   315|          <div className="flex items-center gap-4 flex-wrap">
   316|            <div className="flex items-center gap-2">
   317|              <label className="text-sm font-medium text-muted-foreground">Year:</label>
   318|              <select
   319|                value={selectedYear}
   320|                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
   321|                className="px-4 py-2 border border-border/50 rounded-lg bg-card text-foreground"
   322|              >
   323|                <option value={2024}>2024</option>
   324|                <option value={2025}>2025</option>
   325|              </select>
   326|            </div>
   327|            
   328|            <div className="flex items-center gap-2">
   329|              <label className="text-sm font-medium text-muted-foreground">Week:</label>
   330|              <select
   331|                value={selectedWeek}
   332|                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
   333|                className="px-4 py-2 border border-border/50 rounded-lg bg-card text-foreground"
   334|              >
   335|                {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
   336|                  <option key={week} value={week}>
   337|                    Week {week}
   338|                  </option>
   339|                ))}
   340|              </select>
   341|            </div>
   342|
   343|            <Button
   344|              onClick={() => refetchScores()}
   345|              disabled={isRefetching}
   346|              variant="outline"
   347|              size="sm"
   348|              className="ml-auto border-border/50"
   349|            >
   350|              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
   351|              {isRefetching ? "Refreshing..." : "Refresh"}
   352|            </Button>
   353|          </div>
   354|        </CardContent>
   355|      </Card>
   356|
   357|      {/* Main Content */}
   358|      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
   359|        {/* Leaderboard */}
   360|        <div className="lg:col-span-1">
   361|          <Card className="gradient-card border-border/50">
   362|            <CardHeader>
   363|              <CardTitle className="flex items-center gap-2 text-foreground">
   364|                <Award className="w-5 h-5 text-[#FFD700]" />
   365|                Leaderboard
   366|              </CardTitle>
   367|              <CardDescription>
   368|                {selectedYear} - Week {selectedWeek}
   369|              </CardDescription>
   370|            </CardHeader>
   371|            <CardContent>
   372|              {rankedScores.length === 0 ? (
   373|                <div className="text-center py-12">
   374|                  <div className="w-16 h-16 rounded-2xl bg-muted/30 mx-auto mb-4 flex items-center justify-center">
   375|                    <Award className="w-8 h-8 text-muted-foreground" />
   376|                  </div>
   377|                  <div className="space-y-2 text-sm text-muted-foreground">
   378|                    <p>No scores yet for this week.</p>
   379|                    <p>Scores appear after weekly stats are synced and scoring has been run for the selected year and week.</p>
   380|                  </div>
   381|                </div>
   382|              ) : (
   383|                <div className="space-y-2">
   384|                  {rankedScores.map((score) => (
   385|                    <button
   386|                      key={score.teamId}
   387|                      onClick={() => setSelectedTeamId(score.teamId)}
   388|                      className={`w-full p-4 rounded-xl border transition-all card-hover-lift text-left ${
   389|                        selectedTeamId === score.teamId
   390|                          ? 'bg-primary/10 border-primary glow-primary'
   391|                          : 'bg-card/50 border-border/50 hover:border-primary/30'
   392|                      } ${score.rank === 1 ? 'winner-celebration' : ''}`}
   393|                    >
   394|                      <div className="flex items-center justify-between">
   395|                        <div className="flex items-center gap-3">
   396|                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
   397|                            score.rank === 1 ? 'rank-gold text-white' :
   398|                            score.rank === 2 ? 'rank-silver text-white' :
   399|                            score.rank === 3 ? 'rank-bronze text-white' :
   400|                            'bg-muted text-muted-foreground'
   401|                          }`}>
   402|                            {score.rank}
   403|                          </div>
   404|                          <div className="flex-1 min-w-0">
   405|                            <div className={`font-bold truncate ${
   406|                              score.rank <= 3 ? 'text-gradient-primary' : 'text-foreground'
   407|                            }`}>
   408|                              {score.teamName}
   409|                            </div>
   410|                            {isCalculating && liveScores.find(s => s.teamId === score.teamId) && (
   411|                              <Badge variant="secondary" className="text-xs mt-1 gradient-primary text-white">
   412|                                <Zap className="w-3 h-3 mr-1" />
   413|                                Live
   414|                              </Badge>
   415|                            )}
   416|                          </div>
   417|                        </div>
   418|                        <div className="text-right">
   419|                          <div className={`text-3xl font-bold score-animate ${
   420|                            score.rank === 1 ? 'text-gradient-primary' : 'text-foreground'
   421|                          }`}>
   422|                            {score.points?.toFixed(1) || '0.0'}
   423|                          </div>
   424|                          <div className="text-xs text-muted-foreground uppercase">pts</div>
   425|                        </div>
   426|                      </div>
   427|                    </button>
   428|                  ))}
   429|                </div>
   430|              )}
   431|            </CardContent>
   432|          </Card>
   433|        </div>
   434|
   435|        {/* Scoring Breakdown */}
   436|        <div className="lg:col-span-2">
   437|          {!selectedTeamId ? (
   438|            <Card className="gradient-card border-border/50">
   439|              <CardContent className="py-20">
   440|                <div className="text-center max-w-md mx-auto">
   441|                  <div className="w-20 h-20 rounded-2xl bg-muted/30 mx-auto mb-6 flex items-center justify-center">
   442|                    <UserCircle className="w-10 h-10 text-muted-foreground" />
   443|                  </div>
   444|                  <p className="text-xl font-bold text-foreground mb-2">
   445|                    Select a Team
   446|                  </p>
   447|                  <p className="text-muted-foreground">
   448|                    Choose a team from the leaderboard to view their detailed scoring breakdown
   449|                  </p>
   450|                </div>
   451|              </CardContent>
   452|            </Card>
   453|          ) : !breakdown ? (
   454|            <Card className="gradient-card border-border/50">
   455|              <CardContent className="py-20">
   456|                <div className="text-center max-w-md mx-auto space-y-4">
   457|                  <div className="w-20 h-20 rounded-2xl bg-muted/30 mx-auto flex items-center justify-center">
   458|                    <BarChart3 className="w-10 h-10 text-muted-foreground" />
   459|                  </div>
   460|                  <div>
   461|                    <p className="text-xl font-bold text-foreground mb-2">Live Scoring Active</p>
   462|                    <p className="text-muted-foreground">
   463|                      Scores are being calculated. If you see 0.0, partial stats for this week may not be synced yet. 
   464|                      Check back later or click "Calculate Scores" to force an update.
   465|                    </p>
   466|                  </div>
   467|                </div>
   468|              </CardContent>
   469|            </Card>
   470|          ) : (
   471|            <div className="space-y-4">
   472|              <Card>
   473|                <CardHeader>
   474|                  <CardTitle className="flex items-center gap-2">
   475|                    <BarChart3 className="w-5 h-5" />
   476|                    Scoring Breakdown
   477|                  </CardTitle>
   478|                  <CardDescription>
   479|                    Detailed points breakdown for {rankedScores.find(s => s.teamId === selectedTeamId)?.teamName}
   480|                  </CardDescription>
   481|                </CardHeader>
   482|                <CardContent>
   483|                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
   484|                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
   485|                      <div className="text-sm text-muted-foreground mb-1">Manufacturers</div>
   486|                      <div className="text-2xl font-bold text-foreground">
   487|                        {(breakdown.score.mfg1Points || 0) + (breakdown.score.mfg2Points || 0)}
   488|                      </div>
   489|                    </div>
   490|                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
   491|                      <div className="text-sm text-muted-foreground mb-1">Strains</div>
   492|                      <div className="text-2xl font-bold text-foreground">
   493|                        {(breakdown.score.cstr1Points || 0) + (breakdown.score.cstr2Points || 0)}
   494|                      </div>
   495|                    </div>
   496|                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
   497|                      <div className="text-sm text-muted-foreground mb-1">Products</div>
   498|                      <div className="text-2xl font-bold text-foreground">
   499|                        {(breakdown.score.prd1Points || 0) + (breakdown.score.prd2Points || 0)}
   500|                      </div>
   501|                    </div>
   502|                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
   503|                      <div className="text-sm text-muted-foreground mb-1">Pharmacies</div>
   504|                      <div className="text-2xl font-bold text-foreground">
   505|                        {(breakdown.score.phm1Points || 0) + (breakdown.score.phm2Points || 0)}
   506|                      </div>
   507|                    </div>
   508|                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
   509|                      <div className="text-sm text-muted-foreground mb-1">Brands</div>
   510|                      <div className="text-2xl font-bold text-foreground">
   511|                        {breakdown.score.brd1Points || 0}
   512|                      </div>
   513|                    </div>
   514|                  </div>
   515|
   516|                  {/* Visual Enhancements */}
   517|                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
   518|                    <CategoryBarChart
   519|                      categories={[
   520|                        { name: 'Manufacturers', points: (breakdown.score.mfg1Points || 0) + (breakdown.score.mfg2Points || 0), color: 'bg-blue-500' },
   521|                        { name: 'Strains', points: (breakdown.score.cstr1Points || 0) + (breakdown.score.cstr2Points || 0), color: 'bg-green-500' },
   522|                        { name: 'Products', points: (breakdown.score.prd1Points || 0) + (breakdown.score.prd2Points || 0), color: 'bg-purple-500' },
   523|                        { name: 'Pharmacies', points: (breakdown.score.phm1Points || 0) + (breakdown.score.phm2Points || 0), color: 'bg-orange-500' },
   524|                        { name: 'Brands', points: breakdown.score.brd1Points || 0, color: 'bg-yellow-500' },
   525|                      ]}
   526|                      totalPoints={breakdown.score.totalPoints || 0}
   527|                    />
   528|                    <TopPerformersPanel
   529|                      performers={breakdown.breakdowns
   530|                        .map((b: any) => ({
   531|                          assetName: b.assetName || `${b.assetType} #${b.assetId}`,
   532|                          assetType: b.assetType,
   533|                          points: b.totalPoints || 0,
   534|                          category: b.assetType === 'manufacturer' ? 'Manufacturer' :
   535|                                   b.assetType === 'cannabis_strain' ? 'Strain' :
   536|                                   b.assetType === 'product' ? 'Product' :
   537|                                   b.assetType === 'pharmacy' ? 'Pharmacy' : 'Brand',
   538|                        }))
   539|                        .sort((a: any, b: any) => b.points - a.points)
   540|                      }
   541|                    />
   542|                  </div>
   543|
   544|                  {/* Individual Asset Breakdowns */}
   545|                  <div className="mb-4 flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
   546|                    <div className="flex items-center gap-2">
   547|                      <label className="text-sm font-medium">Sort by:</label>
   548|                      <select
   549|                        value={assetSortBy}
   550|                        onChange={(e) => setAssetSortBy(e.target.value as 'points' | 'name' | 'type')}
   551|                        className="px-3 py-1.5 text-sm border rounded-md bg-background"
   552|                      >
   553|                        <option value="points">Points (High to Low)</option>
   554|                        <option value="name">Name (A-Z)</option>
   555|                        <option value="type">Type</option>
   556|                      </select>
   557|                    </div>
   558|                    <div className="flex items-center gap-2">
   559|                      <label className="text-sm font-medium">Filter:</label>
   560|                      <select
   561|                        value={assetFilter}
   562|                        onChange={(e) => setAssetFilter(e.target.value)}
   563|                        className="px-3 py-1.5 text-sm border rounded-md bg-background"
   564|                      >
   565|                        <option value="all">All Assets</option>
   566|                        <option value="manufacturer">Manufacturers</option>
   567|                        <option value="cannabis_strain">Strains</option>
   568|                        <option value="product">Products</option>
   569|                        <option value="pharmacy">Pharmacies</option>
   570|                        <option value="brand">Brands</option>
   571|                      </select>
   572|                    </div>
   573|                  </div>
   574|                  <div className="space-y-4">
   575|                    {breakdown.breakdowns
   576|                      .filter((b: any) => assetFilter === 'all' || b.assetType === assetFilter)
   577|                      .sort((a: any, b: any) => {
   578|                        if (assetSortBy === 'points') {
   579|                          return (b.totalPoints || 0) - (a.totalPoints || 0);
   580|                        } else if (assetSortBy === 'name') {
   581|                          const nameA = a.assetName || `${a.assetType} #${a.assetId}`;
   582|                          const nameB = b.assetName || `${b.assetType} #${b.assetId}`;
   583|                          return nameA.localeCompare(nameB);
   584|                        } else {
   585|                          return a.assetType.localeCompare(b.assetType);
   586|                        }
   587|                      })
   588|                      .map((assetBreakdown: any, index: number) => (
   589|                      <ScoringBreakdown
   590|                        key={index}
   591|                        data={{
   592|                          assetName: assetBreakdown.assetName || `${assetBreakdown.assetType} #${assetBreakdown.assetId}`,
   593|                          assetType: assetBreakdown.assetType,
   594|                          components: assetBreakdown.breakdown?.components || [],
   595|                          bonuses: assetBreakdown.breakdown?.bonuses || [],
   596|                          penalties: assetBreakdown.breakdown?.penalties || [],
   597|                          subtotal: assetBreakdown.breakdown?.subtotal || 0,
   598|                          total: assetBreakdown.totalPoints || 0,
   599|                        }}
   600|                      />
   601|                    ))}
   602|                  </div>
   603|                </CardContent>
   604|              </Card>
   605|            </div>
   606|          )}
   607|        </div>
   608|      </div>
   609|    </div>
   610|    </div>
   611|  );
   612|}
   613|