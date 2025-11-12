import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Calendar, UserCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Matchups Page
 * 
 * Displays weekly head-to-head matchups for a league
 * Shows scores, winners, and upcoming games
 */

export default function Matchups() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [year, setYear] = useState(2025);
  const [week, setWeek] = useState(1);

  const { data: matchups, isLoading, refetch } = trpc.matchup.getWeekMatchups.useQuery({
    leagueId: Number(leagueId),
    year,
    week,
  });

  const { data: league } = trpc.league.getById.useQuery({ id: Number(leagueId) });

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
    generateMatchups.mutate({ leagueId: Number(leagueId), year, week });
  };

  const handleUpdateScores = () => {
    updateScores.mutate({ leagueId: Number(leagueId), year, week });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'final':
        return <Badge variant="secondary">Final</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Matchups</h1>
          <p className="text-muted-foreground">
            {league?.name} - Week {week}, {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {matchups?.length || 0} matchups
          </span>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Week Selector</CardTitle>
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

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Week:</label>
              <Select value={week.toString()} onValueChange={(v) => setWeek(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => refetch()} variant="outline">
              Refresh
            </Button>

            {league?.isCommissioner && (
              <>
                <Button 
                  onClick={handleGenerateMatchups}
                  disabled={generateMatchups.isLoading}
                >
                  {generateMatchups.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Matchups
                </Button>
                <Button 
                  onClick={handleUpdateScores}
                  disabled={updateScores.isLoading}
                  variant="secondary"
                >
                  {updateScores.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Scores
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Matchups List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : matchups && matchups.length > 0 ? (
        <div className="grid gap-4">
          {matchups.map((matchup) => (
            <Card key={matchup.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Team 1 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold text-lg">
                          {matchup.team1?.name || 'Unknown Team'}
                        </h3>
                        {matchup.status === 'final' && matchup.winnerId === matchup.team1Id && (
                          <Trophy className="inline h-4 w-4 text-yellow-500 ml-2" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-6 px-8">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        matchup.winnerId === matchup.team1Id ? 'text-green-600' : ''
                      }`}>
                        {matchup.team1Score}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground">vs</div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        matchup.winnerId === matchup.team2Id ? 'text-green-600' : ''
                      }`}>
                        {matchup.team2Score}
                      </div>
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {matchup.team2?.name || 'Unknown Team'}
                        </h3>
                        {matchup.status === 'final' && matchup.winnerId === matchup.team2Id && (
                          <Trophy className="inline h-4 w-4 text-yellow-500 mr-2" />
                        )}
                      </div>
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4 flex items-center justify-center">
                  {getStatusBadge(matchup.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Matchups Found</h3>
            <p className="text-muted-foreground mb-4">
              There are no matchups scheduled for this week yet.
            </p>
            {league?.isCommissioner && (
              <Button onClick={handleGenerateMatchups}>
                Generate Matchups
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
