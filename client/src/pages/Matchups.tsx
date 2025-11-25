import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { MatchupCard } from "@/components/MatchupCard";
import { cn } from "@/lib/utils";

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

export default function Matchups() {
  const { id } = useParams<{ id: string }>();
  const leagueId = Number(id);
  const now = new Date();
  const { year: currentIsoYear, week: currentIsoWeek } = getIsoYearWeek(now);
  const [year, setYear] = useState(currentIsoYear);
  const [week, setWeek] = useState(currentIsoWeek);

  const { data: matchups, isLoading, refetch } = trpc.matchup.getWeekMatchups.useQuery({
    leagueId,
    year,
    week,
  });

  const { data: league } = trpc.league.getById.useQuery({ leagueId });
  const isSeasonLeague = league?.leagueType === "season";

  const { data: dailyMatchupScores, isLoading: isLoadingDailyScores } =
    trpc.matchup.getMatchupDailyScores.useQuery(
      { leagueId, year, week },
      {
        enabled: Boolean(isSeasonLeague),
      }
    );

  const dailyScoresByMatchup = useMemo(() => {
    if (!dailyMatchupScores) {
      return {};
    }
    return dailyMatchupScores.reduce<Record<number, typeof dailyMatchupScores[number]>>((acc, entry) => {
      acc[entry.matchupId] = entry;
      return acc;
    }, {});
  }, [dailyMatchupScores]);

  // Get team records from league data
  const teamRecords = useMemo(() => {
    if (!league?.teams) return {};
    return league.teams.reduce<Record<number, { wins: number; losses: number; ties: number; rank?: number }>>((acc, team: any) => {
      acc[team.id] = {
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0,
      };
      return acc;
    }, {});
  }, [league?.teams]);

  // Calculate rankings based on wins/losses
  const teamRankings = useMemo(() => {
    if (!league?.teams) return {};
    const sorted = [...league.teams].sort((a: any, b: any) => {
      const aWins = a.wins || 0;
      const bWins = b.wins || 0;
      if (bWins !== aWins) return bWins - aWins;
      return (b.pointsFor || 0) - (a.pointsFor || 0);
    });
    return sorted.reduce<Record<number, number>>((acc, team: any, index) => {
      acc[team.id] = index + 1;
      return acc;
    }, {});
  }, [league?.teams]);

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
    generateMatchups.mutate({ leagueId, year, week });
  };

  const handleUpdateScores = () => {
    updateScores.mutate({ leagueId, year, week });
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
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#0f0c14] to-[#1a1322]">
      {/* Simplified Sleeper-Style Header */}
      <div className="sticky top-0 z-10 bg-[#0a0810]/95 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Matchups
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                {league?.name}
              </p>
            </div>

            {/* Week Navigation - Right Side */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWeek(Math.max(1, week - 1))}
                disabled={week <= 1}
                className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                <span className="text-xs text-white/50 uppercase tracking-wider">Week</span>
                <span className="text-xl font-bold text-white">{week}</span>
                <ChevronDown className="h-4 w-4 text-white/40" />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWeek(Math.min(52, week + 1))}
                disabled={week >= 52}
                className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Admin Actions (only if commissioner) */}
          {league?.isCommissioner && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => refetch()}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {league?.leagueType !== "season" && (
                <Button
                  onClick={handleGenerateMatchups}
                  disabled={generateMatchups.isPending}
                  size="sm"
                  className="bg-primary text-black font-semibold hover:bg-primary/90"
                >
                  {generateMatchups.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              )}
              <Button
                onClick={handleUpdateScores}
                disabled={updateScores.isPending}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                {updateScores.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Scores
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Matchups List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-white/50">Loading matchups...</p>
            </div>
          </div>
        ) : matchups && matchups.length > 0 ? (
          <div className="grid gap-4 md:gap-5 max-w-3xl mx-auto">
            {matchups.map((matchup) => {
              const dailyData = dailyScoresByMatchup[matchup.id];
              const liveTotals =
                isSeasonLeague && dailyData
                  ? dailyData.days.reduce(
                      (acc, day) => {
                        acc.team1Points += day.team1Points || 0;
                        acc.team2Points += day.team2Points || 0;
                        return acc;
                      },
                      { team1Points: 0, team2Points: 0 }
                    )
                  : null;

              const displayTeam1Score =
                liveTotals?.team1Points ??
                matchup.team1Score ??
                0;
              const displayTeam2Score =
                liveTotals?.team2Points ??
                matchup.team2Score ??
                0;

              const team1Record = teamRecords[matchup.team1Id];
              const team2Record = teamRecords[matchup.team2Id];
              const team1Rank = teamRankings[matchup.team1Id];
              const team2Rank = teamRankings[matchup.team2Id];

              // Find team data from league
              const team1Data = league?.teams?.find((t: any) => t.id === matchup.team1Id);
              const team2Data = league?.teams?.find((t: any) => t.id === matchup.team2Id);

              return (
                <div key={matchup.id} className="space-y-3">
                  <MatchupCard
                    team1={{
                      id: matchup.team1Id,
                      name: matchup.team1?.name || "Unknown Team",
                      userName: team1Data?.userName,
                      avatarUrl: team1Data?.userAvatarUrl,
                      score: displayTeam1Score,
                      record: team1Record,
                      rank: team1Rank,
                    }}
                    team2={{
                      id: matchup.team2Id,
                      name: matchup.team2?.name || "Unknown Team",
                      userName: team2Data?.userName,
                      avatarUrl: team2Data?.userAvatarUrl,
                      score: displayTeam2Score,
                      record: team2Record,
                      rank: team2Rank,
                    }}
                    status={
                      matchup.status as
                        | "scheduled"
                        | "in_progress"
                        | "final"
                    }
                    week={week}
                    winnerId={matchup.winnerId || undefined}
                    onClick={() => {
                      toast.info("Matchup details coming soon!");
                    }}
                  />
                  {isSeasonLeague && (
                    <MatchupDailyBreakdown
                      matchup={matchup}
                      dailyData={dailyData}
                      isLoading={isLoadingDailyScores}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border-white/10 bg-white/5 max-w-md mx-auto">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-white/40" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">No Matchups Yet</h3>
              <p className="text-white/50 mb-6">
                There are no matchups scheduled for this week.
                {league?.isCommissioner && " Generate matchups to get started."}
              </p>
              {league?.isCommissioner && (
                <Button
                  onClick={handleGenerateMatchups}
                  className="bg-primary text-black font-semibold hover:bg-primary/90"
                >
                  Generate Matchups
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Standings Preview Section */}
        {league?.teams && league.teams.length > 0 && (
          <StandingsPreview teams={league.teams} leagueId={leagueId} />
        )}
      </div>
    </div>
  );
}

// Standings Preview Component
function StandingsPreview({ teams, leagueId }: { teams: any[]; leagueId: number }) {
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aWins = a.wins || 0;
      const bWins = b.wins || 0;
      if (bWins !== aWins) return bWins - aWins;
      return (b.pointsFor || 0) - (a.pointsFor || 0);
    }).slice(0, 4); // Show top 4
  }, [teams]);

  return (
    <div className="mt-8 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Standings
          </h3>
          <div className="flex items-center gap-2">
            <Link href={`/league/${leagueId}/standings`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80 hover:bg-white/5 text-xs"
              >
                View Details
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
            >
              Playoffs
            </Button>
          </div>
        </div>

        {/* Standings List */}
        <div className="divide-y divide-white/5">
          {sortedTeams.map((team, index) => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0
                    ? "bg-primary text-black"
                    : index === 1
                    ? "bg-white/20 text-white"
                    : index === 2
                    ? "bg-amber-600/30 text-amber-400"
                    : "bg-white/10 text-white/60"
                )}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {team.name}
                </p>
                <p className="text-xs text-white/50">
                  {team.wins || 0}-{team.losses || 0}
                  {(team.ties || 0) > 0 && `-${team.ties}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">
                  {(team.pointsFor || 0).toFixed(1)}
                </p>
                <p className="text-[10px] text-white/40 uppercase">PF</p>
              </div>
              {index === 0 && (
                <Trophy className="w-4 h-4 text-primary ml-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type WeekMatchup = Awaited<ReturnType<typeof trpc.matchup.getWeekMatchups.useQuery>> extends {
  data: infer D;
}
  ? D extends readonly (infer U)[]
    ? U
    : never
  : never;

type MatchupDailyEntry = {
  date: string;
  team1Points: number;
  team2Points: number;
  error?: boolean;
};

type MatchupDailyData = {
  matchupId: number;
  team1Id: number;
  team2Id: number;
  days: MatchupDailyEntry[];
};

function MatchupDailyBreakdown({
  matchup,
  dailyData,
  isLoading,
}: {
  matchup: WeekMatchup;
  dailyData?: MatchupDailyData;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<'all' | string>('all');

  useEffect(() => {
    setSelectedDate('all');
  }, [matchup.id, dailyData?.matchupId]);

  const days = dailyData?.days ?? [];

  const weeklyTotals = useMemo(() => {
    return days.reduce(
      (acc, day) => {
        acc.team1Points += day.team1Points || 0;
        acc.team2Points += day.team2Points || 0;
        return acc;
      },
      { team1Points: 0, team2Points: 0 }
    );
  }, [days]);

  const activeDay =
    selectedDate === 'all'
      ? weeklyTotals
      : days.find((day) => day.date === selectedDate) ?? { team1Points: 0, team2Points: 0 };

  const activeLabel =
    selectedDate === 'all'
      ? 'Whole Week'
      : format(parseISO(selectedDate), "EEE, MMM d");

  const noStats = activeDay.team1Points === 0 && activeDay.team2Points === 0;

  if (!days.length && !isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-white/40 text-center">
        Daily scoring will appear once stats sync for this week.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div>
          <p className="text-xs font-semibold uppercase text-white/40 tracking-wide">
            Day-by-Day Breakdown
          </p>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading daily scores...
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedDate('all')}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full border transition-colors",
                    selectedDate === 'all'
                      ? "bg-primary text-black border-primary"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  )}
                >
                  All Week
                </button>
                {days.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-full border transition-colors",
                      selectedDate === day.date
                        ? "bg-primary text-black border-primary"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                    )}
                  >
                    {format(parseISO(day.date), "EEE d")}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DailyScoreCard
                  label={matchup.team1?.name || "Team 1"}
                  points={activeDay.team1Points}
                  opponentPoints={activeDay.team2Points}
                />
                <DailyScoreCard
                  label={matchup.team2?.name || "Team 2"}
                  points={activeDay.team2Points}
                  opponentPoints={activeDay.team1Points}
                />
              </div>

              <p className="text-xs text-white/30">
                {selectedDate === 'all' ? (
                  <>Totals shown reflect the entire ISO week.</>
                ) : noStats ? (
                  <>No stats were recorded for {activeLabel}.</>
                ) : (
                  <>Showing scores recorded on {activeLabel}.</>
                )}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DailyScoreCard({
  label,
  points,
  opponentPoints,
}: {
  label: string;
  points: number;
  opponentPoints: number;
}) {
  const isLeader = points > opponentPoints;
  const isTied = points === opponentPoints;
  return (
    <div
      className={cn(
        "rounded-xl border p-4 bg-black/20",
        isLeader ? "border-primary/50 shadow-[0_0_20px_rgba(207,255,77,0.1)]" : "border-white/10"
      )}
    >
      <p className="text-xs uppercase text-white/40 font-semibold">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className={cn("text-3xl font-bold", isLeader ? "text-primary" : "text-white")}>
          {points.toFixed(1)}
        </p>
        <span className="text-xs text-white/40">pts</span>
      </div>
      <p className={cn("text-xs font-semibold mt-2", isLeader ? "text-primary" : isTied ? "text-white/40" : "text-white/40")}>
        {isLeader ? "Lead" : isTied ? "Tie" : "Trailing"} by {(Math.abs(points - opponentPoints)).toFixed(1)} pts
      </p>
    </div>
  );
}
