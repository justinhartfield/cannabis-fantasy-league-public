import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Trophy, TrendingUp, CheckCircle, XCircle } from "lucide-react";
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

  const handlePredictionSelect = (matchupId: number, winnerId: number) => {
    setPredictions(prev => {
      const newMap = new Map(prev);
      newMap.set(matchupId, winnerId);
      return newMap;
    });
  };

  const handleSubmit = () => {
    if (!matchupsData?.matchups) return;

    const allPredictions: Prediction[] = [];
    for (const matchup of matchupsData.matchups) {
      const prediction = predictions.get(matchup.id);
      if (prediction) {
        allPredictions.push({
          matchupId: matchup.id,
          predictedWinnerId: prediction,
        });
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
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prediction Streak</h1>
            <p className="text-muted-foreground">Pick the winners and build your streak</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Current Streak</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats?.currentStreak || 0} 🔥
            </p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Best Streak</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats?.longestStreak || 0}
            </p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats?.accuracy || 0}%
            </p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Correct</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats?.correctPredictions || 0}/{stats?.totalPredictions || 0}
            </p>
          </Card>
        </div>
      </header>

      {/* Yesterday's Results */}
      {resultsData && resultsData.results.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Yesterday's Results</h2>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                You got {resultsData.correctCount} out of {resultsData.totalCount} correct
              </span>
              <span className="text-lg font-bold text-foreground">
                {resultsData.accuracy.toFixed(0)}% accuracy
              </span>
            </div>
            <div className="space-y-2">
              {resultsData.results.map(result => (
                <div key={result.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    {result.userPrediction?.isCorrect === 1 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {result.entityAName} vs {result.entityBName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Winner: {result.winnerId === result.entityAId ? result.entityAName : result.entityBName}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Today's Matchups */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">Today's Matchups</h2>
        
        {!matchupsData?.matchups || matchupsData.matchups.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No matchups available today. Check back tomorrow!</p>
          </Card>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {matchupsData.matchups.map((matchup) => {
                const userSelection = predictions.get(matchup.id) || matchup.userPrediction?.predictedWinnerId;
                
                return (
                  <Card key={matchup.id} className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      {/* Entity A */}
                      <button
                        onClick={() => handlePredictionSelect(matchup.id, matchup.entityAId)}
                        disabled={matchupsData.hasSubmitted}
                        className={`flex-1 p-6 rounded-lg border-2 transition ${
                          userSelection === matchup.entityAId
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        } ${matchupsData.hasSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <div className="text-center">
                          {matchup.entityAImage && (
                            <div className="flex justify-center mb-3">
                              <img 
                                src={matchup.entityAImage} 
                                alt={matchup.entityAName}
                                className="w-16 h-16 object-contain rounded-lg"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                          )}
                          <h4 className="font-bold text-lg mb-2">{matchup.entityAName}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {matchup.entityType}
                          </p>
                        </div>
                      </button>

                      {/* VS */}
                      <div className="text-2xl font-bold text-muted-foreground px-4">VS</div>

                      {/* Entity B */}
                      <button
                        onClick={() => handlePredictionSelect(matchup.id, matchup.entityBId)}
                        disabled={matchupsData.hasSubmitted}
                        className={`flex-1 p-6 rounded-lg border-2 transition ${
                          userSelection === matchup.entityBId
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        } ${matchupsData.hasSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <div className="text-center">
                          {matchup.entityBImage && (
                            <div className="flex justify-center mb-3">
                              <img 
                                src={matchup.entityBImage} 
                                alt={matchup.entityBName}
                                className="w-16 h-16 object-contain rounded-lg"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                          )}
                          <h4 className="font-bold text-lg mb-2">{matchup.entityBName}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {matchup.entityType}
                          </p>
                        </div>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Submit Button */}
            {!matchupsData.hasSubmitted && (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || predictions.size !== matchupsData.matchups.length}
                className="w-full py-6 text-lg"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Submit Predictions ({predictions.size}/{matchupsData.matchups.length})
                  </>
                )}
              </Button>
            )}

            {matchupsData.hasSubmitted && (
              <Card className="p-4 bg-green-500/10 border-green-500/20">
                <p className="text-center text-green-600 dark:text-green-400 font-medium">
                  ✓ Predictions submitted! Check back tomorrow to see your results.
                </p>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}
