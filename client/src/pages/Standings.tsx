import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (league?.leagueType === "challenge" && leagueId) {
      setLocation(`/challenge/${leagueId}`);
    }
  }, [league, leagueId, setLocation]);

  if (league?.leagueType === "challenge") {
    return null;
  }

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
    <div className="min-h-screen gradient-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gradient-primary flex items-center gap-3">
                <Trophy className="w-9 h-9" />
                STANDINGS
              </h1>
              <p className="text-muted-foreground mt-2">
                {league?.name} • {year} Season
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 border border-border/50">
              <Trophy className="h-5 w-5 text-[#FFD700]" />
              <span className="text-sm font-semibold text-foreground">
                {standings?.length || 0} Teams
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <Card className="mb-6 gradient-card border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Year:</label>
                <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-[120px] bg-card border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">View:</label>
                <Select value={view} onValueChange={(v: any) => setView(v)}>
                  <SelectTrigger className="w-[160px] bg-card border-border/50">
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
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading standings...</p>
            </div>
          </div>
        ) : displayData && displayData.length > 0 ? (
          <Card className="gradient-card border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-foreground text-xl">
                {view === 'power' ? 'Power Rankings' : 'League Standings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/30">
                  <TableHead className="w-[80px] text-foreground font-bold">RK</TableHead>
                  <TableHead className="text-foreground font-bold">TEAM</TableHead>
                  <TableHead className="text-center text-foreground font-bold">W</TableHead>
                  <TableHead className="text-center text-foreground font-bold">L</TableHead>
                  <TableHead className="text-center text-foreground font-bold">T</TableHead>
                  <TableHead className="text-center text-foreground font-bold">WIN%</TableHead>
                  <TableHead className="text-right text-foreground font-bold">PF</TableHead>
                  <TableHead className="text-right text-foreground font-bold">PA</TableHead>
                  <TableHead className="text-right text-foreground font-bold">DIFF</TableHead>
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
                {displayData.map((team: any, index: number) => (
                  <TableRow key={team.teamId} className="border-border/30 hover:bg-muted/20 transition-colors">
                    <TableCell className="font-bold">
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
            </div>
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
    </div>
  );
}
