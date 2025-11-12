import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, TrendingUp, TrendingDown, Minus } from "@/lib/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Standings Page
 * 
 * Displays league standings with win/loss records
 * Shows playoff seeding and power rankings
 */

export default function Standings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [year, setYear] = useState(2025);
  const [view, setView] = useState<'standings' | 'power'>('standings');

  const { data: standings, isLoading } = trpc.standings.getLeagueStandings.useQuery({
    leagueId: Number(leagueId),
    year,
  });

  const { data: powerRankings, isLoading: powerLoading } = trpc.standings.getPowerRankings.useQuery({
    leagueId: Number(leagueId),
    year,
  });

  const { data: league } = trpc.league.getById.useQuery({ id: Number(leagueId) });

  const getRankBadge = (rank: number, playoffTeams: number = 6) => {
    if (rank === 1) {
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    } else if (rank === 2) {
      return <Trophy className="h-5 w-5 text-gray-400" />;
    } else if (rank === 3) {
      return <Trophy className="h-5 w-5 text-amber-600" />;
    } else if (rank <= playoffTeams) {
      return <Badge variant="default">Playoff</Badge>;
    }
    return null;
  };

  const formatWinPct = (pct: number) => {
    return pct.toFixed(3);
  };

  const displayData = view === 'power' ? powerRankings : standings;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Standings</h1>
          <p className="text-muted-foreground">
            {league?.name} - {year} Season
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {standings?.length || 0} teams
          </span>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>View Options</CardTitle>
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
              <label className="text-sm font-medium">View:</label>
              <Select value={view} onValueChange={(v: any) => setView(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standings">Standings</SelectItem>
                  <SelectItem value="power">Power Rankings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standings Table */}
      {(isLoading || powerLoading) ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayData && displayData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {view === 'power' ? 'Power Rankings' : 'League Standings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="text-center">T</TableHead>
                  <TableHead className="text-center">Win %</TableHead>
                  <TableHead className="text-right">PF</TableHead>
                  <TableHead className="text-right">PA</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                  {view === 'power' && (
                    <>
                      <TableHead className="text-center">Recent</TableHead>
                      <TableHead className="text-center">SOS</TableHead>
                      <TableHead className="text-right">Power</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((team: any) => (
                  <TableRow key={team.teamId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{team.rank}</span>
                        {getRankBadge(team.rank, league?.playoffTeams || 6)}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{team.teamName}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {team.wins}
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {team.losses}
                    </TableCell>
                    <TableCell className="text-center text-gray-600 font-medium">
                      {team.ties}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatWinPct(team.winPercentage)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {team.pointsFor.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {team.pointsAgainst.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={team.pointsDifferential >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {team.pointsDifferential >= 0 ? '+' : ''}
                        {team.pointsDifferential.toFixed(1)}
                      </span>
                    </TableCell>
                    {view === 'power' && (
                      <>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            {team.recentForm >= 0.67 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : team.recentForm <= 0.33 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-600" />
                            )}
                            <span className="ml-1 text-xs">
                              {(team.recentForm * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {formatWinPct(team.strengthOfSchedule)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {team.powerScore.toFixed(1)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Standings Available</h3>
            <p className="text-muted-foreground">
              Standings will appear once matchups have been completed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Playoff Line */}
      {standings && standings.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Top {league?.playoffTeams || 6} teams make playoffs
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs">1st Place</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="h-5">Playoff</Badge>
                  <span className="text-xs">Playoff Team</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
