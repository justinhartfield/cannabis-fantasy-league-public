import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trophy, Medal } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ChallengeResults() {
  const { id } = useParams();
  const navigate = useLocation();
  const { user } = useAuth();
  const challengeId = parseInt(id!);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch challenge details
  const { data: challenge, isLoading: challengeLoading } = trpc.challenge.getById.useQuery({
    challengeId,
  });

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = trpc.challenge.getLeaderboard.useQuery({
    challengeId,
  });

  // Fetch breakdown for selected user
  const { data: breakdown, isLoading: breakdownLoading } = trpc.challengeScoring.getParticipantBreakdown.useQuery(
    {
      challengeId,
      userId: selectedUserId || user?.id || 0,
    },
    { enabled: !!selectedUserId || !!user?.id }
  );

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null;
    
    if (rank === 1) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">🥇 1st</Badge>;
    } else if (rank === 2) {
      return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 2nd</Badge>;
    } else if (rank === 3) {
      return <Badge className="bg-amber-600 hover:bg-amber-700">🥉 3rd</Badge>;
    } else {
      return <Badge variant="outline">{rank}th</Badge>;
    }
  };

  if (challengeLoading || leaderboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge || !leaderboard) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-xl font-semibold mb-2">Results Not Available</h3>
            <Button onClick={() => setLocation("/challenges")} className="mt-4">
              Back to Challenges
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/challenge/${challengeId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Challenge
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">{challenge.name} - Results</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Week {challenge.week}, {challenge.year}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Leaderboard
              </CardTitle>
              <CardDescription>Final Standings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((participant, index) => {
                  const rank = index + 1;
                  const isSelected = participant.userId === (selectedUserId || user?.id);
                  
                  return (
                    <div
                      key={participant.userId}
                      onClick={() => setSelectedUserId(participant.userId)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 border-primary" : "bg-card hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRankBadge(rank)}
                          <div>
                            <div className="font-medium">
                              {participant.username || participant.email}
                              {participant.userId === user?.id && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {participant.finalScore || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scoring Breakdown */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Breakdown</CardTitle>
              <CardDescription>
                {breakdown?.participant.userId === user?.id 
                  ? "Your detailed scoring" 
                  : `Detailed scoring for ${leaderboard.find(p => p.userId === (selectedUserId || user?.id))?.username || "participant"}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : !breakdown ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a participant to view their breakdown
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Totals */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Manufacturers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {breakdown.categoryTotals.manufacturer}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Strains
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {breakdown.categoryTotals.cannabis_strain}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Pharmacies
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {breakdown.categoryTotals.pharmacy}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Brands
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {breakdown.categoryTotals.brand}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Individual Assets */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Individual Assets</h3>
                    <div className="space-y-2">
                      {breakdown.roster.map((asset, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">R{asset.draftRound}</Badge>
                            <div>
                              <div className="font-medium capitalize">
                                {asset.assetType.replace("_", " ")}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Pick #{asset.draftPick}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{asset.points || 0}</div>
                            <div className="text-xs text-muted-foreground">points</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-semibold">Total Points</div>
                      <div className="text-3xl font-bold text-primary">
                        {breakdown.totalPoints || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
