import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState, type SVGProps } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Flame,
  Handshake,
  Leaf,
  Loader2,
  Package,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { LiveActivityTicker } from "@/components/LiveActivityTicker";

type LeaderboardPlayer = {
  rank?: number;
  name: string;
  avatarUrl?: string | null;
  currentStreak?: number;
  longestStreak?: number;
};

const DEFAULT_LEADERS: LeaderboardPlayer[] = [
  { name: "GreenThumb", currentStreak: 5, longestStreak: 12 },
  { name: "BlazeMaster", currentStreak: 4, longestStreak: 10 },
  { name: "HighRoller", currentStreak: 3, longestStreak: 9 },
];

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [inviteCode, setInviteCode] = useState("");
  const [joiningLeague, setJoiningLeague] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const { data: myLeagues, isLoading: leaguesLoading } = trpc.league.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: stats } = trpc.stats.getStats.useQuery();
  const {
    data: predictionLeaders,
    isLoading: predictionLeadersLoading,
  } = trpc.prediction.getLeaderboard.useQuery({ limit: 3 });

  const joinLeagueMutation = trpc.league.joinByCode.useMutation({
    onSuccess: (data) => {
      toast.success("Successfully joined league!");
      setInviteCode("");
      setJoiningLeague(false);
      const path =
        data.leagueType === "challenge"
          ? `/challenge/${data.leagueId}`
          : `/league/${data.leagueId}`;
      setLocation(path);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to join league");
      setJoiningLeague(false);
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleJoinLeague = async () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    const trimmedCode = inviteCode.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      toast.error("Invite code must be exactly 6 characters");
      return;
    }
    setJoiningLeague(true);
    try {
      await joinLeagueMutation.mutateAsync({ leagueCode: trimmedCode });
    } catch {
      // handled in onError
    }
  };

  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl();
    if (loginUrl) window.location.href = loginUrl;
    else window.location.href = "/login";
    return null;
  }

  if (authLoading || leaguesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-weed-green" />
      </div>
    );
  }

  const seasonLeagues = myLeagues?.filter((league) => league.leagueType !== "challenge") ?? [];
  const challengeLeagues = myLeagues?.filter((league) => league.leagueType === "challenge") ?? [];

  const leaderboardPlayers: LeaderboardPlayer[] =
    predictionLeaders?.leaderboard?.slice(0, 3) ?? DEFAULT_LEADERS;
  const leaderboardLoading = predictionLeadersLoading && !predictionLeaders;

  const nextUpdateTime = getNextTopOfHour(now);
  const nextUpdateCountdown = formatDurationMs(nextUpdateTime.getTime() - now.getTime());

  const statHighlights = [
    {
      label: "Manufacturers",
      value: stats?.manufacturerCount ?? 0,
      icon: FactoryIcon,
      gradient: "from-[#67ff85] via-[#26d9ff] to-[#1360ff]",
    },
    {
      label: "Products",
      value: stats?.productCount ?? 0,
      icon: Package,
      gradient: "from-[#ff6b6b] via-[#ee5a5a] to-[#c44569]",
    },
    {
      label: "Strains",
      value: stats?.cannabisStrainCount ?? 0,
      icon: Leaf,
      gradient: "from-[#ffaf32] via-[#ff5c47] to-[#ff2bd0]",
    },
    {
      label: "Pharmacies",
      value: stats?.pharmacyCount ?? 0,
      icon: Handshake,
      gradient: "from-[#ffd924] via-[#ffa200] to-[#ff5c47]",
    },
    {
      label: "Brands",
      value: stats?.brandCount ?? 0,
      icon: Users,
      gradient: "from-[#8b5cf6] via-[#6366f1] to-[#22d3ee]",
    },
  ];

  const predictionProgress = Math.min((user?.currentPredictionStreak ?? 0) / 10, 1);

  return (
    <div className="space-y-8 pb-12">
      <LiveActivityTicker />

      {/* Daily Summary Widget */}
      <DailySummaryWidget />

      <section className="rounded-[32px] bg-gradient-to-br from-[#0d0d0f] to-[#1c1b22] p-6 shadow-[0_25px_75px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Dashboard</p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Welcome back, {user?.name?.split(" ")[0] || "Manager"}.
            </h1>
            <p className="text-sm text-white/70">
              Track your leagues, lock in predictions, and keep the streak alive.
            </p>
          </div>
          <Link
            href="/league/create"
            className="inline-flex items-center justify-center rounded-2xl bg-weed-green px-6 py-3 text-sm font-semibold text-black transition hover:bg-weed-green/80"
          >
            Start New League
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Mobile: Compact single-line stats */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 sm:hidden">
          {statHighlights.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "flex-shrink-0 rounded-xl px-3 py-2 text-white shadow-md",
                "bg-gradient-to-br",
                stat.gradient
              )}
            >
              <div className="flex items-center gap-2">
                <stat.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm font-bold whitespace-nowrap">{stat.value.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Full stat cards */}
        <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {statHighlights.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-2xl p-4 text-white shadow-lg transition hover:translate-y-[-2px]",
                "bg-gradient-to-br",
                stat.gradient
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/70">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                </div>
                <span className="rounded-2xl bg-black/20 p-3">
                  <stat.icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-white/70 sm:text-sm">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-weed-green opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-weed-green" />
          </span>
          <span>
            NEXT LIVE UPDATE FROM{" "}
            <span className="font-semibold text-weed-green">Weed.de</span> in{" "}
            <span className="font-mono text-white">{nextUpdateCountdown}</span>
          </span>
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] bg-white/5 p-5 shadow-inner backdrop-blur">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/league/create"
            className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-weed-green to-emerald-400 px-5 py-4 text-left text-white transition hover:scale-[1.01]"
          >
            <div>
              <p className="text-xs uppercase tracking-widest">Quick Action</p>
              <p className="text-lg font-semibold">Create New League</p>
              <p className="text-sm text-white/80">Season or daily challenge</p>
            </div>
            <ArrowRight className="h-6 w-6" />
          </Link>

          <Link
            href="/league/create?type=challenge"
            className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-5 py-4 text-left text-white transition hover:scale-[1.01]"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70">Game Mode</p>
              <p className="text-lg font-semibold">Daily Challenge</p>
              <p className="text-sm text-white/70">5-min lineup battles</p>
            </div>
            <Zap className="h-6 w-6" />
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            Got Invite Code?
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="ENTER CODE"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoinLeague()}
              maxLength={6}
              disabled={joiningLeague}
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center text-lg font-mono tracking-[0.5em] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weed-green"
            />
            <Button
              onClick={handleJoinLeague}
              disabled={joiningLeague}
              className="h-12 rounded-2xl bg-weed-green px-6 text-base font-semibold text-black hover:bg-weed-green/80"
            >
              {joiningLeague ? "Joining..." : "Enter"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[28px] bg-white/5 p-5 shadow-inner">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">Leaderboard</p>
              <h2 className="text-xl font-semibold text-white">Top Squads</h2>
            </div>
            <Link href="/rankings" className="text-sm font-semibold text-weed-green">
              See all
            </Link>
          </div>
          {leaderboardLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-weed-green" />
            </div>
          ) : (
            <ul className="space-y-3">
              {leaderboardPlayers.map((player, index) => {
                const rankDisplay = player.rank ?? index + 1;
                const current = player.currentStreak ?? 0;
                const best = player.longestStreak ?? 0;
                const initials = player.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?";
                return (
                  <li
                    key={`${player.name}-${index}`}
                    className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.name}
                            className="h-10 w-10 rounded-2xl object-cover ring-2 ring-weed-green/30"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-weed-green/30 to-weed-purple/30 text-sm font-bold text-white/80">
                            {initials}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-weed-green text-[10px] font-bold text-black">
                          {rankDisplay}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-semibold">
                          {player.name}
                        </p>
                        <p className="text-xs text-white/50">
                          Current streak: {current} • Best {best}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-white/60">
                      <p className="font-semibold text-white">
                        {current} 🔥
                      </p>
                      <p className="text-xs text-white/50">
                        Best {best}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <Link
          href="/prediction-streak"
          className="rounded-[28px] bg-gradient-to-br from-[#1f1b2e] to-[#2d1f33] p-6 text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Daily Game</p>
              <h2 className="text-2xl font-semibold">Prediction Streak</h2>
              <p className="text-sm text-white/70">
                {user?.currentPredictionStreak || 0} day streak • Best {user?.longestPredictionStreak || 0}
              </p>
            </div>
            <span className="rounded-3xl bg-white/10 p-4">
              <Flame className="h-7 w-7 text-weed-green" />
            </span>
          </div>
          <div className="mt-6">
            <div className="h-3 rounded-full bg-white/10">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-weed-green to-weed-coral transition-all"
                style={{ width: `${predictionProgress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/60">
              {Math.round(predictionProgress * 100)}% to next badge
            </p>
          </div>
        </Link>
      </section>

      <section className="space-y-4 rounded-[28px] bg-white/5 p-5 shadow-inner">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">My Leagues</p>
            <h2 className="text-2xl font-semibold text-white">
              {seasonLeagues.length > 0
                ? `${seasonLeagues.length} active ${seasonLeagues.length === 1 ? "league" : "leagues"}`
                : "Get in the game"}
            </h2>
          </div>
          {seasonLeagues.length > 0 && (
            <Link href="/leagues" className="text-sm font-semibold text-weed-green">
              Manage
            </Link>
          )}
        </div>

        {seasonLeagues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/20 p-6 text-center text-white/70">
            <p className="text-lg font-semibold">No leagues yet</p>
            <p className="mt-2 text-sm">Create or join a league to start competing.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/league/create"
                className="rounded-2xl bg-weed-green px-5 py-2 text-sm font-semibold text-black"
              >
                Create League
              </Link>
              <Link
                href="/leagues"
                className="rounded-2xl border border-white/20 px-5 py-2 text-sm font-semibold text-white"
              >
                Browse
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {seasonLeagues.map((league) => (
              <button
                key={league.id}
                onClick={() => setLocation(`/league/${league.id}`)}
                className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-black/40 px-4 py-4 text-left text-white transition hover:border-weed-green/60 hover:bg-black/60"
              >
                <div>
                  <p className="text-lg font-semibold">{league.name}</p>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                    {league.status ?? "Active"}
                  </p>
                </div>
                <div className="text-right text-sm text-white/60">
                  <p>{league.teams?.length ?? 0} teams</p>
                  {league.currentWeek && <p>Week {league.currentWeek}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-[28px] bg-white/5 p-5 shadow-inner">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Daily Challenges</p>
            <h2 className="text-xl font-semibold text-white">Lightning rounds</h2>
          </div>
        </div>
        {challengeLeagues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/20 p-6 text-center text-white/70">
            <p className="text-sm">No active challenges right now.</p>
            <p className="text-xs text-white/50">New daily battles drop at 8:00 AM.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {challengeLeagues.map((league) => (
              <button
                key={league.id}
                onClick={() => setLocation(`/challenge/${league.id}`)}
                className="flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-[#ff5c47]/20 to-transparent px-4 py-4 text-left text-white"
              >
                <div>
                  <p className="text-lg font-semibold">{league.name}</p>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">Daily Challenge</p>
                </div>
                <Zap className="h-5 w-5 text-weed-green" />
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 border-t border-white/10 pt-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/rules"
            className="group flex items-center gap-2 rounded-full bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <span className="rounded-full bg-weed-green/20 p-1">
              <Trophy className="h-4 w-4 text-weed-green" />
            </span>
            Rules & How to Play
            <ArrowRight className="h-4 w-4 text-white/50 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="text-xs text-white/30">
            Cannabis Fantasy League © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

function DailySummaryWidget() {
  const { data: summary } = trpc.dailySummary.getLatest.useQuery();

  if (!summary) return null;

  return (
    <Link href="/daily-summary">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 p-4 shadow-lg transition hover:scale-[1.01] cursor-pointer border border-white/10">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Trophy className="h-24 w-24" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                DAILY RECAP
              </span>
              <span className="text-xs text-white/60">
                {new Date(summary.date).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white line-clamp-1">
              {summary.headline}
            </h3>
            <p className="text-sm text-white/80 line-clamp-2 max-w-2xl">
              {summary.content.split('\n')[0]}
            </p>
          </div>
          <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-white/10">
            <ArrowRight className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function FactoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 21h18M5 21V9l6 5V9l6 5V3"
      />
    </svg>
  );
}

function getNextTopOfHour(from: Date) {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);

  if (next <= from) {
    next.setHours(next.getHours() + 1);
  }

  return next;
}

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}
