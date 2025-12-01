import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import ScoringCard, { adaptLegacyData } from "@/components/ScoringCard";
import {
  RefreshCw,
  BarChart3,
  UserCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LeagueNav } from "@/components/LeagueNav";
import { TrendIndicator } from "@/components/TrendIndicator";
import { TeamAvatar } from "@/components/TeamAvatar";
import { BattleArena } from "@/components/BattleArena";
import { cn } from "@/lib/utils";

interface TeamScore {
  teamId: number;
  teamName: string;
  points: number;
  rank?: number;
  userAvatarUrl?: string | null;
  fighterIllustration?: string | null;
  battlefieldBackground?: string | null;
}

const getRankBadgeClass = (rank?: number) => {
  switch (rank) {
    case 1:
      return "bg-[#cfff4d] text-black";
    case 2:
      return "bg-[#d0c2ff] text-[#2b1d52]";
    case 3:
      return "bg-[#ffcf9f] text-[#4b230c]";
    default:
      return "bg-white/10 text-white/70";
  }
};

const assetGroupOrder: Array<
  "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand"
> = ["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"];

const assetTypeLabels: Record<string, string> = {
  manufacturer: "Manufacturers",
  cannabis_strain: "Strains",
  product: "Products",
  pharmacy: "Pharmacies",
  brand: "Brands",
};

// Helper to get current ISO year/week (mirrors server/utils/isoWeek.ts)
function getIsoYearWeek(date: Date): { year: number; week: number } {
  const tempDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(
    Date.UTC(tempDate.getUTCFullYear(), 0, 1)
  );
  const week = Math.ceil(
    ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: tempDate.getUTCFullYear(), week };
}

/**
 * Scoring Page
 * 
 * Displays:
 * - Weekly team scores and rankings
 * - Battle Arena with fighter illustrations
 * - Detailed scoring breakdowns for each team
 * - Real-time score updates via WebSocket
 */
export default function Scoring() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const leagueId = parseInt(id!);
  const { user } = useAuth();

  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [liveScores, setLiveScores] = useState<TeamScore[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [assetSortBy, setAssetSortBy] = useState<'points' | 'name' | 'type'>('points');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const autoScoreTriggeredRef = useRef<Set<string>>(new Set());
  const autoWeekBackfillRef = useRef<Set<string>>(new Set());
  const manualSelectionRef = useRef(false);

  useEffect(() => {
    manualSelectionRef.current = false;
    autoWeekBackfillRef.current.clear();
    autoScoreTriggeredRef.current.clear();
    setDefaultsApplied(false);
  }, [leagueId]);

  // Fetch league data
  const { data: league, refetch: refetchLeague } = trpc.league.getById.useQuery({ leagueId: leagueId });

  // Fetch team scores for selected week
  const { data: weekScores, refetch: refetchScores, isRefetching } =
    trpc.scoring.getLeagueWeekScores.useQuery(
      {
        leagueId,
        year: selectedYear,
        week: selectedWeek,
      },
      {
        enabled: !!leagueId && !!user,
      }
    );

  // Fetch LIVE cumulative scores for the current week
  const { data: cumulativeLiveScores } =
    trpc.scoring.getLeagueLiveScores.useQuery(
      {
        leagueId,
        year: selectedYear,
        week: selectedWeek,
      },
      {
        enabled:
          !!leagueId &&
          !!user &&
          !!weekScores &&
          weekScores.every((s) => s.points === 0),
        refetchInterval: 60000,
      }
    );

  // Fetch scoring breakdown for selected team
  const { data: breakdown, isLoading: isLoadingBreakdown } = trpc.scoring.getTeamBreakdown.useQuery(
    {
      teamId: Number(selectedTeamId),
      year: selectedYear,
      week: selectedWeek,
    },
    {
      enabled: !!selectedTeamId && !!user && !!selectedYear && !!selectedWeek,
    }
  );

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

  const userTeam = league?.teams?.find((team: any) => team.userId === user?.id);
  const isCommissioner = league?.commissionerUserId === user?.id;

  useEffect(() => {
    if (league?.leagueType === "challenge") {
      setLocation(`/challenge/${leagueId}`);
    }
  }, [league, leagueId, setLocation]);

  useEffect(() => {
    if (!league || defaultsApplied) {
      return;
    }

    const now = new Date();
    const { year: isoYear, week: isoWeek } = getIsoYearWeek(now);

    const defaultYear = league.leagueType === "season"
      ? isoYear
      : league.seasonYear || isoYear;
    const defaultWeek = league.leagueType === "season"
      ? isoWeek
      : Math.max(1, (league.currentWeek ?? 1) - 1);

    setSelectedYear(defaultYear);
    setSelectedWeek(defaultWeek);
    setDefaultsApplied(true);
  }, [league, defaultsApplied]);

  // Auto-calculate scores if data is missing and user is admin/commissioner
  useEffect(() => {
    if (!weekScores || weekScores.length === 0) {
      return;
    }

    const now = new Date();
    const { year: isoYear, week: isoWeek } = getIsoYearWeek(now);

    const expectedYear = league?.leagueType === "season"
      ? isoYear
      : league?.seasonYear || isoYear;
    const expectedWeek = league?.leagueType === "season"
      ? isoWeek
      : Math.max(1, (league?.currentWeek ?? 1) - 1);
    const matchesActiveSelection =
      defaultsApplied &&
      selectedYear === expectedYear &&
      selectedWeek === expectedWeek;

    const autoKey = `${leagueId}-${selectedYear}-${selectedWeek}`;
    const alreadyTriggered = autoScoreTriggeredRef.current.has(autoKey);

    if (
      !isCalculating &&
      !isRefetching &&
      !calculateScoresMutation.isPending &&
      matchesActiveSelection &&
      !alreadyTriggered &&
      weekScores.every((s) => s.points === 0) &&
      (user?.role === 'admin' || isCommissioner)
    ) {
      autoScoreTriggeredRef.current.add(autoKey);
      console.log("Auto-triggering score calculation for empty week...");
      setIsCalculating(true);
      setLiveScores([]);
      calculateScoresMutation.mutate({
        leagueId,
        year: selectedYear,
        week: selectedWeek,
      });
    }
  }, [
    weekScores,
    isCalculating,
    isRefetching,
    user?.role,
    isCommissioner,
    calculateScoresMutation,
    leagueId,
    selectedYear,
    selectedWeek,
    defaultsApplied,
    league?.seasonYear,
    league?.currentWeek,
    league?.leagueType,
  ]);

  useEffect(() => {
    if (
      !defaultsApplied ||
      manualSelectionRef.current ||
      !weekScores ||
      weekScores.length === 0 ||
      league?.leagueType === "season"
    ) {
      return;
    }

    const fallbackKey = `${leagueId}-${selectedYear}-${selectedWeek}`;
    if (
      weekScores.every((s) => s.points === 0) &&
      selectedWeek > 1 &&
      !autoWeekBackfillRef.current.has(fallbackKey)
    ) {
      autoWeekBackfillRef.current.add(fallbackKey);
      setSelectedWeek((prev) => Math.max(1, prev - 1));
    }
  }, [
    defaultsApplied,
    weekScores,
    selectedWeek,
    leagueId,
    selectedYear,
    league?.leagueType,
  ]);

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    userId: user?.id || 0,
    leagueId,
    onMessage: (message) => {
      if (message.type === 'team_score_calculated') {
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

  // Handle fighter change
  const handleFighterChange = () => {
    refetchLeague();
  };

  // Merge live scores with fetched scores
  const useLiveCalculation = weekScores && weekScores.every(s => s.points === 0) && cumulativeLiveScores && cumulativeLiveScores.some(s => s.points > 0);

  // Enrich scores with team data from league
  const enrichedScores = useMemo(() => {
    const baseScores = liveScores.length > 0
      ? liveScores
      : useLiveCalculation
        ? cumulativeLiveScores
        : weekScores || [];

    return baseScores.map((score) => {
      const teamData = league?.teams?.find((t: any) => t.id === score.teamId);
      return {
        ...score,
        userAvatarUrl: teamData?.userAvatarUrl || null,
        fighterIllustration: teamData?.fighterIllustration || null,
        battlefieldBackground: teamData?.battlefieldBackground || null,
        userName: teamData?.userName || null,
      };
    });
  }, [liveScores, useLiveCalculation, cumulativeLiveScores, weekScores, league?.teams]);

  const dedupedBreakdowns = useMemo(() => {
    if (!breakdown?.breakdowns) {
      return [];
    }

    const map = new Map<string, any>();
    for (const entry of breakdown.breakdowns) {
      const key = `${entry.position}-${entry.assetType}-${entry.assetId ?? 'na'}`;
      if (!map.has(key)) {
        map.set(key, entry);
      }
    }
    return Array.from(map.values());
  }, [breakdown]);

  const filteredBreakdowns = useMemo(() => {
    return dedupedBreakdowns
      .filter(
        (b: any) => assetFilter === "all" || b.assetType === assetFilter
      )
      .sort((a: any, b: any) => {
        if (assetSortBy === "points") {
          return (b.totalPoints || 0) - (a.totalPoints || 0);
        } else if (assetSortBy === "name") {
          const nameA = a.assetName || `${a.assetType} #${a.assetId}`;
          const nameB = b.assetName || `${b.assetType} #${b.assetId}`;
          return nameA.localeCompare(nameB);
        } else {
          return (a.assetType || "").localeCompare(b.assetType || "");
        }
      });
  }, [dedupedBreakdowns, assetFilter, assetSortBy]);

  // Sort and rank teams
  const rankedScores = [...enrichedScores]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }));

  // Auto-select the top-ranked team
  useEffect(() => {
    if (!rankedScores.length || selectedTeamId) {
      return;
    }
    const topTeamId = rankedScores[0]?.teamId;
    if (topTeamId) {
      setSelectedTeamId(Number(topTeamId));
    }
  }, [rankedScores, selectedTeamId]);

  const selectedTeamScore = selectedTeamId
    ? rankedScores.find((score) => score.teamId === selectedTeamId)
    : null;

  const primaryTeam = rankedScores[0] || null;
  const secondaryTeam =
    selectedTeamScore && primaryTeam && selectedTeamScore.teamId !== primaryTeam.teamId
      ? selectedTeamScore
      : rankedScores[1] || null;

  const topAssetLeaders = dedupedBreakdowns
    .map((asset: any) => ({
      id: `${asset.position}-${asset.assetId ?? "na"}-${asset.assetType}`,
      name: asset.assetName || `${asset.assetType} #${asset.assetId ?? "?"}`,
      type: asset.assetType,
      points: asset.totalPoints || 0,
      components: asset.breakdown?.components?.length || 0,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Loading league...</p>
      </div>
    );
  }

  if (league.leagueType === "challenge") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#0f0c14] to-[#1a1322] text-white">
      <LeagueNav
        leagueId={leagueId}
        leagueName={league.name}
        teamCount={league.teams?.length || 0}
        maxTeams={league.maxTeams}
        leagueType={league.leagueType}
        isCommissioner={isCommissioner}
        hasTeam={!!userTeam}
        currentPage="scoring"
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        {/* Week Navigation Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Scoring
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  Offline
                </div>
              )}
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                manualSelectionRef.current = true;
                setSelectedWeek(Math.max(1, selectedWeek - 1));
              }}
              disabled={selectedWeek <= 1}
              className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-xs text-white/50 uppercase tracking-wider">Week</span>
              <span className="text-xl font-bold text-white">{selectedWeek}</span>
              <ChevronDown className="h-4 w-4 text-white/40" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                manualSelectionRef.current = true;
                setSelectedWeek(Math.min(52, selectedWeek + 1));
              }}
              disabled={selectedWeek >= 52}
              className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {user?.role === "admin" && (
              <Button
                onClick={handleCalculateScores}
                disabled={isCalculating}
                size="sm"
                className="ml-2 bg-primary text-black font-semibold hover:bg-primary/90"
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Recalculate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Battle Arena - Leader vs Challenger */}
        <BattleArena
          leftTeam={primaryTeam ? {
            teamId: primaryTeam.teamId,
            teamName: primaryTeam.teamName,
            userName: (primaryTeam as any).userName,
            userAvatarUrl: primaryTeam.userAvatarUrl,
            fighterIllustration: primaryTeam.fighterIllustration,
            battlefieldBackground: primaryTeam.battlefieldBackground,
            points: primaryTeam.points || 0,
          } : null}
          rightTeam={secondaryTeam ? {
            teamId: secondaryTeam.teamId,
            teamName: secondaryTeam.teamName,
            userName: (secondaryTeam as any).userName,
            userAvatarUrl: secondaryTeam.userAvatarUrl,
            fighterIllustration: secondaryTeam.fighterIllustration,
            battlefieldBackground: secondaryTeam.battlefieldBackground,
            points: secondaryTeam.points || 0,
          } : null}
          isLive={isConnected}
          challengeDate={`${selectedYear} • Week ${selectedWeek}`}
          userTeamId={userTeam?.id}
          onFighterChange={handleFighterChange}
          onBackgroundChange={handleFighterChange}
        />

        {/* Main Content Grid */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          {/* Leaderboard */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Leaderboard</p>
                <h2 className="text-xl font-semibold text-white">
                  {selectedYear} • Week {selectedWeek}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">
                  {rankedScores.length} Teams
                </span>
                <Button
                  onClick={() => refetchScores()}
                  disabled={isRefetching}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
                </Button>
              </div>
            </div>

            {rankedScores.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 px-6 py-10 text-center text-sm text-white/60">
                No scores yet for this week. Run scoring once stats sync.
              </div>
            ) : (
              <div className="space-y-2">
                {rankedScores.map((score) => {
                  const isSelected = selectedTeamId === score.teamId;
                  const isTopThree = (score.rank ?? 0) <= 3;

                  return (
                    <button
                      key={score.teamId}
                      onClick={() => setSelectedTeamId(Number(score.teamId))}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                        isSelected
                          ? "border-primary bg-white/10 ring-1 ring-primary/50"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                        isTopThree && !isSelected &&
                          "bg-gradient-to-r from-white/10 via-white/5 to-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                            getRankBadgeClass(score.rank)
                          )}
                        >
                          {score.rank}
                        </span>
                        <TeamAvatar
                          teamName={score.teamName}
                          avatarUrl={score.userAvatarUrl}
                          size="sm"
                          className="border border-white/10"
                        />
                        <div>
                          <p
                            className={cn(
                              "font-semibold text-sm",
                              score.rank === 1 ? "text-primary" : "text-white"
                            )}
                          >
                            {score.teamName}
                          </p>
                          <p className="text-xs text-white/50">
                            {score.points?.toFixed(1) ?? "0.0"} pts
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {score.points?.toFixed(1) ?? "0.0"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Components */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Game Leaders</p>
              <h2 className="text-xl font-semibold text-white">Top Components</h2>
            </div>
            {topAssetLeaders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 px-6 py-10 text-center text-sm text-white/60">
                No component scoring yet for this team/week.
              </div>
            ) : (
              <div className="space-y-3">
                {topAssetLeaders.map((asset, index) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-[#1a0f1a] to-transparent px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-black">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-white text-sm">{asset.name}</p>
                        <p className="text-xs uppercase tracking-wider text-white/50">
                          {asset.type.replace("_", " ")} • {asset.components} comps
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-secondary">
                        {asset.points.toFixed(1)}
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <TrendIndicator value={asset.points} showPercentage={false} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Team Breakdown Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          {!selectedTeamId ? (
            <div className="py-16 text-center text-white/60">
              <UserCircle className="mx-auto mb-4 h-10 w-10 text-white/40" />
              <p className="text-lg font-semibold text-white">Select a team</p>
              <p className="text-sm text-white/50">
                Pick a team from the leaderboard to view their scoring breakdown.
              </p>
            </div>
          ) : !breakdown || isLoadingBreakdown ? (
            <div className="py-16 text-center text-white/60">
              <BarChart3 className="mx-auto mb-4 h-10 w-10 animate-pulse text-white/40" />
              <p className="text-lg font-semibold text-white">Loading breakdown…</p>
              <p className="text-sm text-white/50">
                Fetching scoring details for this team and week.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Team Breakdown
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  {selectedTeamScore?.teamName || "Team"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    {
                      label: "Manufacturers",
                      value:
                        (breakdown.score.mfg1Points || 0) +
                        (breakdown.score.mfg2Points || 0),
                    },
                    {
                      label: "Strains",
                      value:
                        (breakdown.score.cstr1Points || 0) +
                        (breakdown.score.cstr2Points || 0),
                    },
                    {
                      label: "Products",
                      value:
                        (breakdown.score.prd1Points || 0) +
                        (breakdown.score.prd2Points || 0),
                    },
                    {
                      label: "Pharmacies",
                      value:
                        (breakdown.score.phm1Points || 0) +
                        (breakdown.score.phm2Points || 0),
                    },
                    {
                      label: "Brands",
                      value: breakdown.score.brd1Points || 0,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
                    >
                      <p className="text-xs uppercase tracking-wider text-white/50">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {stat.value.toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-white/50">Sort by</label>
                  <select
                    value={assetSortBy}
                    onChange={(e) =>
                      setAssetSortBy(e.target.value as "points" | "name" | "type")
                    }
                    className="rounded-full border border-white/20 bg-transparent px-3 py-1 text-white text-sm focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="points">Points</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-white/50">Filter</label>
                  <select
                    value={assetFilter}
                    onChange={(e) => setAssetFilter(e.target.value)}
                    className="rounded-full border border-white/20 bg-transparent px-3 py-1 text-white text-sm focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="all">All</option>
                    <option value="manufacturer">Manufacturers</option>
                    <option value="cannabis_strain">Strains</option>
                    <option value="product">Products</option>
                    <option value="pharmacy">Pharmacies</option>
                    <option value="brand">Brands</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                {(() => {
                  const grouped: Record<string, any[]> = {};
                  filteredBreakdowns.forEach((item) => {
                    const key = item.assetType || "other";
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(item);
                  });

                  const sections = assetGroupOrder
                    .map((type) => ({
                      type,
                      label: assetTypeLabels[type],
                      items: grouped[type] || [],
                    }))
                    .filter((section) => section.items.length > 0);

                  if (sections.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center text-white/60">
                        No scoring components match this filter.
                      </div>
                    );
                  }

                  return sections.map((section) => (
                    <div key={section.type} className="space-y-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
                        {section.label}
                      </h4>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {section.items.map((assetBreakdown: any, index: number) => (
                          <ScoringCard
                            key={`${section.type}-${index}`}
                            {...adaptLegacyData({
                              assetName:
                                assetBreakdown.assetName ||
                                `${assetBreakdown.assetType} #${assetBreakdown.assetId}`,
                              assetType: assetBreakdown.assetType,
                              imageUrl: assetBreakdown.imageUrl || null,
                              components: assetBreakdown.breakdown?.components || [],
                              bonuses: assetBreakdown.breakdown?.bonuses || [],
                              penalties: assetBreakdown.breakdown?.penalties || [],
                              subtotal: assetBreakdown.breakdown?.subtotal || 0,
                              total: assetBreakdown.totalPoints || 0,
                              trendMultiplier: assetBreakdown.breakdown?.trendMultiplier,
                              streakDays: assetBreakdown.breakdown?.streakDays,
                              marketSharePercent:
                                assetBreakdown.breakdown?.marketSharePercent,
                              consistencyScore: assetBreakdown.breakdown?.consistencyScore,
                              velocityScore: assetBreakdown.breakdown?.velocityScore,
                              currentRank: assetBreakdown.breakdown?.currentRank,
                            })}
                          />
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
