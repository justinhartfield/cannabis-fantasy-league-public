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
      <div className="min-h-screen bg-weed-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-weed-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-weed-cream relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pattern-dots opacity-30 pointer-events-none"></div>

      {/* Floating Wayfinder Characters */}
      <img 
        src="/src/assets/wayfinder/wayfinder-ice-cream.gif" 
        alt="Wayfinder Ice Cream" 
        className="fixed top-20 left-10 w-24 h-24 object-contain z-10 animate-bounce"
        style={{ animationDuration: '3s' }}
      />
      <img 
        src="/src/assets/wayfinder/wayfinder-heart.gif" 
        alt="Wayfinder Heart" 
        className="fixed top-32 right-16 w-20 h-20 object-contain z-10 animate-bounce"
        style={{ animationDuration: '4s', animationDelay: '0.5s' }}
      />
      <img 
        src="/src/assets/wayfinder/wayfinder-cloud.gif" 
        alt="Wayfinder Cloud" 
        className="fixed bottom-40 left-20 w-28 h-28 object-contain z-10 animate-bounce"
        style={{ animationDuration: '3.5s', animationDelay: '1s' }}
      />
      <img 
        src="/src/assets/wayfinder/wayfinder-flower.gif" 
        alt="Wayfinder Flower" 
        className="fixed bottom-32 right-24 w-24 h-24 object-contain z-10 animate-bounce"
        style={{ animationDuration: '4.5s', animationDelay: '1.5s' }}
      />

      <div className="container mx-auto px-4 py-8 relative z-20">
        {/* Header with Wayfinder Characters */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-weed-green to-weed-coral flex items-center justify-center shadow-lg">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="headline-primary text-weed-coral uppercase">Prediction Streak</h1>
                <p className="text-foreground text-lg">Pick the winners and build your streak</p>
              </div>
            </div>
            {/* Header Wayfinder Characters */}
            <div className="flex gap-4">
              <img 
                src="/src/assets/wayfinder/wayfinder-pancake.gif" 
                alt="Wayfinder Pancake" 
                className="w-20 h-20 object-contain"
              />
              <img 
                src="/src/assets/wayfinder/wayfinder-goddess.gif" 
                alt="Wayfinder Goddess" 
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-2 border-weed-green shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-weed-coral" />
                <span className="text-sm text-gray-700 font-semibold">Current Streak</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats?.currentStreak || 0} 🔥
              </p>
            </Card>
            
            <Card className="p-4 bg-white border-2 border-weed-green shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-700 font-semibold">Best Streak</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats?.longestStreak || 0}
              </p>
            </Card>
            
            <Card className="p-4 bg-white border-2 border-weed-green shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-weed-green" />
                <span className="text-sm text-gray-700 font-semibold">Accuracy</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats?.accuracy || 0}%
              </p>
            </Card>
            
            <Card className="p-4 bg-white border-2 border-weed-green shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700 font-semibold">Total Correct</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats?.correctPredictions || 0}/{stats?.totalPredictions || 0}
              </p>
            </Card>
          </div>
        </header>

        {/* Yesterday's Results */}
        {resultsData && resultsData.results.length > 0 && (
          <section className="mb-8 relative">
            {/* Wayfinder Character next to section */}
            <img 
              src="/src/assets/wayfinder/wayfinder-pillow.gif" 
              alt="Wayfinder Pillow" 
              className="absolute -left-16 top-0 w-20 h-20 object-contain hidden lg:block"
            />
            <h2 className="headline-secondary text-foreground mb-4 uppercase">Yesterday's Results</h2>
            <Card className="p-6 bg-white border-2 border-weed-coral shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-foreground font-medium">
                  You got {resultsData.correctCount} out of {resultsData.totalCount} correct
                </span>
                <span className="text-2xl font-bold text-weed-coral">
                  {resultsData.accuracy.toFixed(0)}% accuracy
                </span>
              </div>
              <div className="space-y-2">
                {resultsData.results.map(result => (
                  <div key={result.id} className="flex items-center justify-between p-3 rounded-lg bg-weed-cream border border-gray-200">
                    <div className="flex items-center gap-2">
                      {result.userPrediction?.isCorrect === 1 ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {result.entityAName} vs {result.entityBName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-700 font-medium">
                      Winner: {result.winnerId === result.entityAId ? result.entityAName : result.entityBName}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {/* Today's Matchups */}
        <section className="relative">
          {/* Wayfinder Character next to section */}
          <img 
            src="/src/assets/wayfinder/wayfinder-bud-inspector.gif" 
            alt="Wayfinder Bud Inspector" 
            className="absolute -right-16 top-0 w-20 h-20 object-contain hidden lg:block"
          />
          <h2 className="headline-secondary text-foreground mb-4 uppercase">Today's Matchups</h2>
          
          {!matchupsData?.matchups || matchupsData.matchups.length === 0 ? (
            <Card className="p-8 text-center bg-white border-2 border-weed-green shadow-xl">
              <p className="text-foreground text-lg">No matchups available today. Check back tomorrow!</p>
            </Card>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {matchupsData.matchups.map((matchup) => {
                  const userSelection = predictions.get(matchup.id) || matchup.userPrediction?.predictedWinnerId;
                  
                  return (
                    <Card key={matchup.id} className="p-6 bg-white border-2 border-gray-300 shadow-xl hover:border-weed-green transition">
                      <div className="flex items-center justify-between gap-4">
                        {/* Entity A */}
                        <button
                          onClick={() => handlePredictionSelect(matchup.id, matchup.entityAId)}
                          disabled={matchupsData.hasSubmitted}
                          className={`flex-1 p-6 rounded-lg border-2 transition ${
                            userSelection === matchup.entityAId
                              ? 'border-weed-green bg-weed-green/10'
                              : 'border-gray-300 hover:border-weed-green/50'
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
                            <h4 className="font-bold text-lg mb-2 text-foreground">{matchup.entityAName}</h4>
                            <p className="text-sm text-gray-700 capitalize font-medium">
                              {matchup.entityType}
                            </p>
                          </div>
                        </button>

                        {/* VS */}
                        <div className="text-2xl font-bold text-weed-coral px-4">VS</div>

                        {/* Entity B */}
                        <button
                          onClick={() => handlePredictionSelect(matchup.id, matchup.entityBId)}
                          disabled={matchupsData.hasSubmitted}
                          className={`flex-1 p-6 rounded-lg border-2 transition ${
                            userSelection === matchup.entityBId
                              ? 'border-weed-green bg-weed-green/10'
                              : 'border-gray-300 hover:border-weed-green/50'
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
                            <h4 className="font-bold text-lg mb-2 text-foreground">{matchup.entityBName}</h4>
                            <p className="text-sm text-gray-700 capitalize font-medium">
                              {matchup.entityType}
                            </p>
                          </div>
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Submit Button with Wayfinder Character */}
              <div className="relative">
                <img 
                  src="/src/assets/wayfinder/wayfinder-family-flower.gif" 
                  alt="Wayfinder Family Flower" 
                  className="absolute -left-24 -top-4 w-24 h-24 object-contain hidden lg:block"
                />
                {!matchupsData.hasSubmitted && (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending || predictions.size !== matchupsData.matchups.length}
                    className="w-full py-6 text-lg bg-weed-green text-black hover:bg-weed-green/90 font-bold uppercase shadow-xl"
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
                  <Card className="p-6 bg-weed-green/10 border-2 border-weed-green shadow-xl">
                    <p className="text-center text-weed-green font-bold text-lg">
                      ✓ Predictions submitted! Check back tomorrow to see your results.
                    </p>
                  </Card>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
