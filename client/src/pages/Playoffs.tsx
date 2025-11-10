import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Crown, Award } from "lucide-react";
import { toast } from "sonner";

/**
 * Playoffs Page
 * 
 * Displays playoff bracket with matchups
 * Shows championship results
 */

export default function Playoffs() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [year, setYear] = useState(2025);

  const { data: league } = trpc.league.getById.useQuery({ id: Number(leagueId) });

  const { data: bracket, isLoading, refetch } = trpc.playoff.getPlayoffBracket.useQuery({
    leagueId: Number(leagueId),
    year,
    playoffStartWeek: league?.playoffStartWeek || 19,
  }, {
    enabled: !!league,
  });

  const { data: summary } = trpc.playoff.getPlayoffSummary.useQuery({
    leagueId: Number(leagueId),
    year,
  });

  const generateBracket = trpc.playoff.generatePlayoffBracket.useMutation({
    onSuccess: () => {
      toast.success("Playoff bracket generated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateBracket = () => {
    if (!league) return;
    generateBracket.mutate({
      leagueId: Number(leagueId),
      year,
      playoffStartWeek: league.playoffStartWeek,
      playoffTeams: league.playoffTeams,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'final':
        return <Badge variant="secondary">Final</Badge>;
      case 'pending':
        return <Badge variant="outline" className="opacity-50">TBD</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Playoffs
          </h1>
          <p className="text-muted-foreground">
            {league?.name} - {year} Postseason
          </p>
        </div>
        {summary?.champion && (
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <div>
              <div className="text-sm text-muted-foreground">Champion</div>
              <div className="font-bold">{summary.champion.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Playoff Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Year:</label>
              <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => refetch()} variant="outline">
              Refresh
            </Button>

            {league?.isCommissioner && !bracket?.length && (
              <Button 
                onClick={handleGenerateBracket}
                disabled={generateBracket.isLoading}
              >
                {generateBracket.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Playoff Bracket
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Playoff Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Playoff Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Start Week</div>
                <div className="text-2xl font-bold">{summary.playoffStartWeek}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Rounds</div>
                <div className="text-2xl font-bold">{summary.rounds}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Matchups</div>
                <div className="text-2xl font-bold">
                  {summary.completedMatchups}/{summary.totalMatchups}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-2xl font-bold">
                  {summary.isComplete ? (
                    <Badge variant="default">Complete</Badge>
                  ) : (
                    <Badge variant="outline">In Progress</Badge>
                  )}
                </div>
              </div>
            </div>

            {summary.champion && summary.runnerUp && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">Champion</div>
                    <div className="text-xl font-bold">{summary.champion.name}</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Award className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">Runner-Up</div>
                    <div className="text-xl font-bold">{summary.runnerUp.name}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Playoff Bracket */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : bracket && bracket.length > 0 ? (
        <div className="space-y-6">
          {bracket.map((round) => (
            <Card key={round.round}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {round.round === bracket.length && <Trophy className="h-5 w-5 text-yellow-500" />}
                  {round.roundName}
                  <Badge variant="outline" className="ml-2">Round {round.round}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {round.matchups.map((matchup, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 border rounded-lg ${
                        matchup.status === 'pending' ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Matchup {idx + 1}
                        </span>
                        {getStatusBadge(matchup.status)}
                      </div>

                      <div className="space-y-2">
                        {/* Team 1 */}
                        <div className={`flex items-center justify-between p-3 rounded ${
                          matchup.winnerId === matchup.team1Id ? 'bg-green-50 dark:bg-green-950' : 'bg-gray-50 dark:bg-gray-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            {matchup.seed1 > 0 && (
                              <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                {matchup.seed1}
                              </Badge>
                            )}
                            <span className="font-semibold">
                              {matchup.team1Name || 'TBD'}
                            </span>
                            {matchup.winnerId === matchup.team1Id && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <span className="text-2xl font-bold">
                            {matchup.status !== 'pending' ? matchup.team1Score : '-'}
                          </span>
                        </div>

                        {/* Team 2 */}
                        <div className={`flex items-center justify-between p-3 rounded ${
                          matchup.winnerId === matchup.team2Id ? 'bg-green-50 dark:bg-green-950' : 'bg-gray-50 dark:bg-gray-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            {matchup.seed2 > 0 && (
                              <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                {matchup.seed2}
                              </Badge>
                            )}
                            <span className="font-semibold">
                              {matchup.team2Name || 'TBD'}
                            </span>
                            {matchup.winnerId === matchup.team2Id && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <span className="text-2xl font-bold">
                            {matchup.status !== 'pending' ? matchup.team2Score : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Playoff Bracket</h3>
            <p className="text-muted-foreground mb-4">
              The playoff bracket hasn't been generated yet.
            </p>
            {league?.isCommissioner && (
              <Button onClick={handleGenerateBracket}>
                Generate Playoff Bracket
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
