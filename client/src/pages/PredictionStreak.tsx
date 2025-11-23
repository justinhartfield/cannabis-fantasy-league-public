import { useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Zap,
  Trophy,
  TrendingUp,
  CheckCircle,
  XCircle,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";

interface Prediction {
  matchupId: number;
  predictedWinnerId: number;
}

export default function PredictionStreak() {
  const utils = trpc.useUtils();
  const [predictions, setPredictions] = useState<Map<number, number>>(new Map());

  const { data: matchupsData, isLoading: matchupsLoading } = trpc.prediction.getDailyMatchups.useQuery();
  const { data: resultsData } = trpc.prediction.getYesterdayResults.useQuery();
  const { data: stats } = trpc.prediction.getUserStats.useQuery();

  const submitMutation = trpc.prediction.submitPredictions.useMutation({
    onSuccess: () => {
      toast.success("Predictions submitted! Check back tomorrow to see how you did.");
      utils.prediction.getDailyMatchups.invalidate();
    },
    onError: (error) => {
      toast.error(`Submission failed: ${error.message}`);
    },
  });

  const activateFreezeMutation = trpc.prediction.activateStreakFreeze.useMutation({
    onSuccess: (data) => {
      if (data.alreadyActive) {
        toast.info("You already have an active streak freeze for today.");
      } else {
        toast.success("Streak freeze activated for today. One loss will not break your streak.");
      }
      utils.prediction.getUserStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate streak freeze.");
    },
  });

  const handlePredictionSelect = (matchupId: number, winnerId: number) => {
    setPredictions((prev) => {
      const next = new Map(prev);
      next.set(matchupId, winnerId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!matchupsData?.matchups) return;

    const allPredictions: Prediction[] = [];
    for (const matchup of matchupsData.matchups) {
      const prediction = predictions.get(matchup.id);
      if (prediction) {
        allPredictions.push({ matchupId: matchup.id, predictedWinnerId: prediction });
      }
    }

    if (allPredictions.length !== matchupsData.matchups.length) {
      toast.error("Please make a prediction for all matchups.");
      return;
    }

    submitMutation.mutate({ predictions: allPredictions });
  };

  if (matchupsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-weed-green" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-[28px] bg-gradient-to-br from-[#1d1e2b] to-[#2e1f35] p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Daily Game</p>
            <h1 className="text-3xl font-bold">Prediction Streak</h1>
            <p className="text-sm text-white/70">Pick the winners, climb the streak meter, claim rewards.</p>
          </div>
          {stats && (
            <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Current Streak</p>
              <p className="text-3xl font-bold">{stats.currentStreak || 0} 🔥</p>
            </div>
          )}
        </div>

        {stats && (
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <StatCard label="Best Streak" icon={<Trophy className="h-4 w-4 text-yellow-400" />}>
              {stats.longestStreak || 0}
            </StatCard>
            <StatCard label="Accuracy" icon={<TrendingUp className="h-4 w-4 text-green-400" />}>
              {stats.accuracy || 0}%
            </StatCard>
            <StatCard label="Total Correct" icon={<CheckCircle className="h-4 w-4 text-weed-green" />}>
              {stats.correctPredictions || 0}/{stats.totalPredictions || 0}
            </StatCard>
            <StatCard label="Freeze Tokens" icon={<Snowflake className="h-4 w-4 text-cyan-300" />}>
              <div className="flex flex-col gap-2">
                <span className="text-2xl font-bold">{stats.streakFreezeTokens || 0}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    activateFreezeMutation.isPending ||
                    !stats ||
                    (stats.streakFreezeTokens || 0) <= 0
                  }
                  onClick={() => activateFreezeMutation.mutate()}
                  className="rounded-2xl border-white/40 text-white"
                >
                  {activateFreezeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...
                    </>
                  ) : (
                    "Activate"
                  )}
                </Button>
              </div>
            </StatCard>
            <StatCard label="Streak Freeze" icon={<Zap className="h-4 w-4 text-pink-300" />}>
              {stats.freezeActive ? "Active" : "Ready"}
            </StatCard>
          </div>
        )}
      </section>

      {resultsData && resultsData.results.length > 0 && (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white shadow-inner">
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Yesterday</p>
              <h2 className="text-2xl font-semibold">Results Recap</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
            <span>You hit {resultsData.correctCount} of {resultsData.totalCount} picks.</span>
            <span className="text-lg font-bold">{resultsData.accuracy.toFixed(0)}% accuracy</span>
          </div>
          <div className="mt-4 space-y-2">
            {resultsData.results.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 px-4 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  {result.userPrediction?.isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-weed-green" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span>
                    {result.entityAName} vs {result.entityBName}
                  </span>
                </div>
                <span className="text-white/60">
                  Winner: {result.winnerId === result.entityAId ? result.entityAName : result.entityBName}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white shadow-inner">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Today</p>
          <h2 className="text-2xl font-semibold">Matchups</h2>
        </div>

        {!matchupsData?.matchups || matchupsData.matchups.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-white/60">
            No matchups available today. Check back tomorrow!
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {matchupsData.matchups.map((matchup) => {
                const userSelection = predictions.get(matchup.id) || matchup.userPrediction?.predictedWinnerId;
                return (
                  <div key={matchup.id} className="rounded-[28px] border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <PredictionButton
                        selected={userSelection === matchup.entityAId}
                        disabled={matchupsData.hasSubmitted}
                        onClick={() => handlePredictionSelect(matchup.id, matchup.entityAId)}
                        name={matchup.entityAName}
                        type={matchup.entityType}
                        image={matchup.entityAImage}
                      />
                      <span className="text-2xl font-bold text-white/40">VS</span>
                      <PredictionButton
                        selected={userSelection === matchup.entityBId}
                        disabled={matchupsData.hasSubmitted}
                        onClick={() => handlePredictionSelect(matchup.id, matchup.entityBId)}
                        name={matchup.entityBName}
                        type={matchup.entityType}
                        image={matchup.entityBImage}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!matchupsData.hasSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={
                  submitMutation.isPending ||
                  predictions.size !== matchupsData.matchups.length
                }
                className="mt-6 w-full rounded-2xl bg-weed-green py-6 text-lg font-semibold text-black"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" /> Submit Predictions ({predictions.size}/{
                      matchupsData.matchups.length
                    })
                  </>
                )}
              </Button>
            ) : (
              <div className="mt-6 rounded-3xl border border-weed-green/30 bg-weed-green/10 p-4 text-center text-sm text-weed-green">
                ✓ Predictions submitted! Check back tomorrow to see your results.
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm text-white">
      <div className="mb-2 flex items-center gap-2 text-white/70">
        {icon}
        <span className="uppercase tracking-[0.3em] text-[10px]">{label}</span>
      </div>
      <div className="text-2xl font-bold">{children}</div>
    </div>
  );
}

function PredictionButton({
  selected,
  disabled,
  onClick,
  name,
  type,
  image,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  name: string;
  type: string;
  image?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-3xl border px-4 py-5 text-center transition ${
        selected ? "border-weed-green bg-weed-green/10" : "border-white/10 bg-black/40 hover:border-weed-green/40"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {image && (
        <div className="mb-3 flex justify-center">
          <img
            src={image}
            alt={name}
            className="h-16 w-16 rounded-2xl object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{name}</h3>
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">{type}</p>
    </button>
  );
}
