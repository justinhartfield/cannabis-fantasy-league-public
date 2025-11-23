import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import ScoringBreakdown from "@/components/ScoringBreakdownV2";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  BarChart3,
  UserCircle,
  Award,
  Zap,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LeagueNav } from "@/components/LeagueNav";
import { ComparisonBar } from "@/components/ComparisonBar";
import { TrendIndicator } from "@/components/TrendIndicator";
import { TeamAvatar } from "@/components/TeamAvatar";
import { cn } from "@/lib/utils";

interface TeamScore {
  teamId: number;
  teamName: string;
  points: number;
  rank?: number;
}

const ScoreCard = ({
  title,
  name,
  score,
  highlight,
  avatarUrl,
}: {
  title: string;
  name?: string;
  score?: number;
  highlight?: boolean;
  avatarUrl?: string | null;
}) => (
  <div
    className={cn(
      "flex-1 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#231035] via-[#1a0d28] to-[#12081c] p-5 text-white shadow-[0_30px_60px_rgba(7,4,18,0.65)] transition",
      highlight ? "glow-primary" : "opacity-90"
    )}
  >
    <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">{title}</p>
    <div className="mt-4 flex items-center gap-3">
      <TeamAvatar avatarUrl={avatarUrl} teamName={name || "Team"} size="md" />
      <div>
        <p className="text-lg font-semibold">{name || "Awaiting team"}</p>
        <p className="text-xs text-white/60">Season points</p>
      </div>
    </div>
    <div className="mt-4 text-4xl font-black">
      {typeof score === "number" ? score.toFixed(1) : "0.0"}
    </div>
  </div>
);

const EmptyScoreCard = ({ label }: { label: string }) => (
  <div className="flex-1 rounded-[28px] border border-dashed border-white/15 bg-white/5 p-5 text-center text-sm text-white/60">
    {label}
  </div>
);

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
 * - Detailed scoring breakdowns for each team
 * - Real-time score updates via WebSocket
 * - Historical scoring trends
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
  const { data: league } = trpc.league.getById.useQuery({ leagueId: leagueId });

  // Fetch team scores for selected week
  const { data: weekScores, refetch: refetchScores, isRefetching } =
    trpc.scoring.getLeagueWeekScores.useQuery(
      {
        leagueId,
        year: selectedYear,
        week: selectedWeek,
      },
      {
        // Only query once we know the league and have an authenticated user
        enabled: !!leagueId && !!user,
      }
    );

  // NEW: Fetch LIVE cumulative scores for the current week
  const { data: cumulativeLiveScores, isLoading: isLoadingLive } =
    trpc.scoring.getLeagueLiveScores.useQuery(
      {
        leagueId,
        year: selectedYear,
        week: selectedWeek,
      },
      {
        // Only query when authenticated, and only for empty official scores
        enabled:
          !!leagueId &&
          !!user &&
          !!weekScores &&
          weekScores.every((s) => s.points === 0),
        refetchInterval: 60000, // Refresh every minute
      }
    );

  // Fetch scoring breakdown for selected team
  const { data: breakdown, isLoading: isLoadingBreakdown } = trpc.scoring.getTeamBreakdown.useQuery(
    {
      // Always coerce to a number so we don't accidentally send a string ID
      teamId: Number(selectedTeamId),
      year: selectedYear,
      week: selectedWeek,
    },
    {
      // Only enable the query when we actually have a selected team and valid context
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

    // For season-long leagues, default to the current ISO week
    // For any other league type, fall back to the previous league week as before
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
  ]);

  useEffect(() => {
    if (
      !defaultsApplied ||
      manualSelectionRef.current ||
      !weekScores ||
      weekScores.length === 0 ||
      // For season-long leagues, do NOT auto-step backwards through weeks.
      // We only load the week the user has selected (defaulting to current ISO week).
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
  // Prioritize:
  // 1. Real-time WebSocket updates (liveScores)
  // 2. Cumulative live calculation (cumulativeLiveScores) - if official scores are 0
  // 3. Official weekly scores (weekScores)
  const useLiveCalculation = weekScores && weekScores.every(s => s.points === 0) && cumulativeLiveScores && cumulativeLiveScores.some(s => s.points > 0);

  const displayScores = liveScores.length > 0
    ? liveScores
    : useLiveCalculation
      ? cumulativeLiveScores
      : weekScores || [];
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
  const rankedScores = [...displayScores]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }));

  // Auto-select the top-ranked team once scores are available so the scoring
  // breakdown becomes immediately visible without requiring an extra click.
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

  const scoreboardDiff =
    (primaryTeam?.points || 0) - (secondaryTeam?.points || 0);

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

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <section className="rounded-[32px] bg-gradient-to-br from-[#1a0f24] via-[#201633] to-[#2f103f] p-6 text-white shadow-[0_35px_80px_rgba(5,0,10,0.8)] space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                Week {selectedWeek} • {selectedYear}
              </p>
              <h1 className="text-3xl font-bold leading-tight">Season Scoring</h1>
              <p className="text-sm text-white/70">
                Live leaderboard, matchup momentum, and detailed scoring breakdowns.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                  isConnected ? "bg-green-500/20 text-green-200" : "bg-white/10 text-white/70"
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isConnected ? "bg-green-400 animate-pulse" : "bg-white/40"
                  )}
                />
                {isConnected ? "Live updates" : "Offline"}
              </div>
              {user?.role === "admin" && (
                <Button
                  onClick={handleCalculateScores}
                  disabled={isCalculating}
                  className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white hover:bg-white/25"
                  variant="ghost"
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

          <div className="rounded-[36px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_70px_rgba(4,4,18,0.55)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
              {primaryTeam ? (
                <ScoreCard
                  title="Leader"
                  name={primaryTeam.teamName}
                  score={primaryTeam.points || 0}
                  highlight
                  avatarUrl={primaryTeam.userAvatarUrl}
                />
              ) : (
                <EmptyScoreCard label="No scores yet" />
              )}

              <div className="flex-1 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#120818] to-[#1e0b28] px-6 py-8 text-center">
                <div className="text-[11px] uppercase tracking-[0.4em] text-white/50">
                  Scoreboard
                </div>
                <div className="mt-4 text-4xl font-black">
                  {(primaryTeam?.points ?? 0).toFixed(1)}
                  <span className="mx-2 text-2xl text-white/50">–</span>
                  {(secondaryTeam?.points ?? 0).toFixed(1)}
                </div>
                <div className="mt-4">
                  <ComparisonBar
                    leftValue={Number((primaryTeam?.points ?? 0).toFixed(1))}
                    rightValue={Number((secondaryTeam?.points ?? 0).toFixed(1))}
                    leftLabel={primaryTeam?.teamName || "Team A"}
                    rightLabel={secondaryTeam?.teamName || "Team B"}
                  />
                </div>
                <div className="mt-4 flex flex-col items-center gap-1">
                  <TrendIndicator value={scoreboardDiff} showPercentage={false} />
                  <span className="text-xs text-white/60">
                    Diff vs. {secondaryTeam?.teamName || "Next Team"}
                  </span>
                </div>
              </div>

              {secondaryTeam ? (
                <ScoreCard
                  title="Challenger"
                  name={secondaryTeam.teamName}
                  score={secondaryTeam.points || 0}
                  avatarUrl={secondaryTeam.userAvatarUrl}
                />
              ) : (
                <EmptyScoreCard label="Waiting for more teams" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col text-xs uppercase text-white/60">
              <span className="mb-2">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  manualSelectionRef.current = true;
                  setSelectedYear(parseInt(e.target.value));
                }}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white focus-visible:ring-2 focus-visible:ring-[#cfff4d]"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
              </select>
            </div>
            <div className="flex flex-col text-xs uppercase text-white/60">
              <span className="mb-2">Week</span>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  manualSelectionRef.current = true;
                  setSelectedWeek(parseInt(e.target.value));
                }}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white focus-visible:ring-2 focus-visible:ring-[#cfff4d]"
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
              disabled={isRefetching}
              className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white hover:bg-white/25"
              variant="ghost"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              {isRefetching ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_50px_rgba(6,6,20,0.45)]">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Leaderboard</p>
                <h2 className="text-xl font-semibold text-white">
                  {selectedYear} • Week {selectedWeek}
                </h2>
              </div>
              <div className="text-sm text-white/60">
                {rankedScores.length} Teams
              </div>
            </div>

            {rankedScores.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/20 px-6 py-10 text-center text-sm text-white/70">
                No scores yet for this week. Run scoring once stats sync.
              </div>
            ) : (
              <div className="space-y-3">
                {rankedScores.map((score) => {
                  const isSelected = selectedTeamId === score.teamId;
                  const isTopThree = (score.rank ?? 0) <= 3;

                  return (
                    <button
                      key={score.teamId}
                      onClick={() => setSelectedTeamId(Number(score.teamId))}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[26px] border px-4 py-4 text-left transition-all",
                        isSelected
                          ? "border-[#cfff4d] bg-white/10 ring-2 ring-[#cfff4d]/70"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                        isTopThree &&
                          "bg-gradient-to-r from-white/10 via-white/5 to-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
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
                              "font-semibold",
                              score.rank === 1 ? "text-[#cfff4d]" : "text-white"
                            )}
                          >
                            {score.teamName}
                          </p>
                          <p className="text-xs text-white/60">
                            {score.points?.toFixed(1) ?? "0.0"} pts
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {score.points?.toFixed(1) ?? "0.0"}
                        </div>
                        <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                          Total
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_50px_rgba(6,6,20,0.45)] space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Game Leaders</p>
              <h2 className="text-xl font-semibold text-white">Top Components</h2>
            </div>
            {topAssetLeaders.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/20 px-6 py-10 text-center text-sm text-white/70">
                No component scoring yet for this team/week.
              </div>
            ) : (
              <div className="space-y-3">
                {topAssetLeaders.map((asset, index) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-[26px] border border-white/10 bg-gradient-to-r from-[#2d0f28] via-[#1b0c1c] to-[#130812] px-4 py-4 shadow-[0_15px_35px_rgba(5,4,15,0.6)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[#cfff4d] px-3 py-1 text-xs font-semibold text-black">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{asset.name}</p>
                        <p className="text-xs uppercase tracking-wider text-white/50">
                          {asset.type.replace("_", " ")} • {asset.components} comps
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#ff744d]">
                        {asset.points.toFixed(1)}
                      </p>
                      <p className="text-xs text-white/60">pts</p>
                      <div className="mt-1 flex justify-end">
                        <TrendIndicator value={asset.points} showPercentage={false} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(4,4,14,0.6)]">
          {!selectedTeamId ? (
            <div className="py-20 text-center text-white/70">
              <UserCircle className="mx-auto mb-4 h-10 w-10 text-white/50" />
              <p className="text-lg font-semibold text-white">Select a team</p>
              <p className="text-sm text-white/60">
                Pick a team from the leaderboard to view their scoring breakdown.
              </p>
            </div>
          ) : !breakdown || isLoadingBreakdown ? (
            <div className="py-20 text-center text-white/70">
              <BarChart3 className="mx-auto mb-4 h-10 w-10 animate-pulse text-white/50" />
              <p className="text-lg font-semibold text-white">Loading breakdown…</p>
              <p className="text-sm text-white/60">
                Fetching scoring details for this team and week.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="text-xs uppercase tracking-[0.4em] text-white/50">
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
                      className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center"
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

              <div className="flex flex-wrap gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-white/60">Sort by</label>
                  <select
                    value={assetSortBy}
                    onChange={(e) =>
                      setAssetSortBy(e.target.value as "points" | "name" | "type")
                    }
                    className="rounded-full border border-white/20 bg-transparent px-3 py-1 text-white focus-visible:ring-2 focus-visible:ring-[#cfff4d]"
                  >
                    <option value="points">Points</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-white/60">Filter</label>
                  <select
                    value={assetFilter}
                    onChange={(e) => setAssetFilter(e.target.value)}
                    className="rounded-full border border-white/20 bg-transparent px-3 py-1 text-white focus-visible:ring-2 focus-visible:ring-[#cfff4d]"
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
                      <div className="rounded-[24px] border border-dashed border-white/15 px-6 py-10 text-center text-white/70">
                        No scoring components match this filter.
                      </div>
                    );
                  }

                  return sections.map((section) => (
                    <div key={section.type} className="space-y-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
                        {section.label}
                      </h4>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {section.items.map((assetBreakdown: any, index: number) => (
                          <ScoringBreakdown
                            key={`${section.type}-${index}`}
                            data={{
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
                            }}
                            variant="app"
                            weekContext={{ year: selectedYear, week: selectedWeek }}
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

