import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Users, Medal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Entity Types
type EntityType = 'all' | 'manufacturer' | 'pharmacy' | 'brand' | 'product' | 'strain';

type LeaderboardPlayer = {
  id?: string;
  name: string;
  currentStreak?: number;
  longestStreak?: number;
  rank?: number;
};

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [entityFilter, setEntityFilter] = useState<EntityType>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Fetch Data
  const dailyQuery = trpc.leaderboard.getDailyEntityLeaderboard.useQuery({
    date: selectedDate,
    limit: 10,
  }, {
    enabled: activeTab === "daily"
  });

  const weeklyQuery = trpc.leaderboard.getWeeklyEntityLeaderboard.useQuery({
    limit: 10,
  }, {
    enabled: activeTab === "weekly"
  });

  const hallOfFameQuery = trpc.leaderboard.getHallOfFame.useQuery({
    limit: 20,
  }, {
    enabled: activeTab === "hof"
  });

  const topSquadsQuery = trpc.prediction.getLeaderboard.useQuery({
    limit: 5,
  }, {
    enabled: activeTab === "hof",
  });

  // Components for rendering
  const EntityList = ({
    title,
    data,
    icon: Icon,
    emptyMessage,
  }: {
    title: string;
    data: any[];
    icon: any;
    emptyMessage?: string;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      {data && data.length > 0 ? (
        <div className="grid gap-3">
          {data.map((item, index) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 font-bold text-muted-foreground">
                  #{index + 1}
                </div>
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={item.logoUrl || item.imageUrl} />
                  <AvatarFallback>{item.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{item.name}</div>
                  {item.rankChange !== undefined && item.rankChange !== 0 && (
                    <div className={cn(
                      "text-xs flex items-center gap-1",
                      item.rankChange > 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {item.rankChange > 0 ? "↑" : "↓"} {Math.abs(item.rankChange)}
                    </div>
                  )}
                </div>
              </div>
              <div className="font-bold text-primary">
                {item.score.toLocaleString()} pts
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage ?? "No data available"}
        </div>
      )}
    </div>
  );

  const TeamList = ({ data, type }: { data: any[], type: 'season' | 'weekly' }) => (
    <div className="grid gap-3">
      {data.map((item, index) => (
        <div 
          key={type === 'season' ? item.teamId : item.scoreId}
          className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 text-xl font-bold text-muted-foreground">
              #{index + 1}
            </div>
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={item.avatarUrl} />
              <AvatarFallback>{item.userName?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-lg">{item.teamName}</div>
              <div className="text-sm text-muted-foreground">
                Manager: {item.userName} • {item.leagueName}
              </div>
              {type === 'weekly' && (
                <div className="text-xs text-muted-foreground mt-1">
                  Week {item.week}, {item.year}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {type === 'season' ? item.totalScore.toLocaleString() : item.score.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Points
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const TopSquadsList = ({
    players,
    loading,
  }: {
    players: LeaderboardPlayer[];
    loading: boolean;
  }) => {
    if (loading) {
      return (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-weed-green" />
          Loading squads...
        </div>
      );
    }

    if (!players.length) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No streak data yet. Jump into the daily game to claim a spot.
        </div>
      );
    }

    return (
      <ul className="space-y-3">
        {players.map((player, index) => {
          const rankDisplay = player.rank ?? index + 1;
          const current = player.currentStreak ?? 0;
          const best = player.longestStreak ?? 0;

          return (
            <li
              key={player.id ?? `${player.name}-${index}`}
              className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white/80">
                  {rankDisplay}
                </div>
                <div>
                  <p className="text-base font-semibold">{player.name}</p>
                  <p className="text-xs text-white/50">
                    Current streak: {current} • Best {best}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-white/60">
                <p className="font-semibold text-white">
                  {current} 🔥
                </p>
                <p className="text-xs text-white/50">Best {best}</p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  // Filter controls
  const EntityFilters = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {(['all', 'manufacturer', 'pharmacy', 'brand', 'product', 'strain'] as const).map((type) => (
        <Button
          key={type}
          variant={entityFilter === type ? "default" : "outline"}
          size="sm"
          onClick={() => setEntityFilter(type)}
          className="capitalize"
        >
          {type === 'strain' ? 'Flower' : type}
        </Button>
      ))}
    </div>
  );

  const cardBase = "rounded-[28px] border border-white/10 bg-white/5 shadow-inner";

  return (
    <div className="space-y-8 pb-12">
      <section className={cn(cardBase, "p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between")}>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Ranks</p>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-sm text-white/70">Top entities, teams, and legendary streaks.</p>
        </div>
        {activeTab === "daily" && (
          <div className="flex flex-col gap-2 text-white">
            <span className="text-xs uppercase tracking-[0.4em] text-white/50">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-2xl border border-white/20 bg-black/30 px-4 py-2 text-sm text-white"
            />
          </div>
        )}
      </section>

      <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto md:mx-0">
          <TabsTrigger value="daily">Daily Leaders</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Leaders</TabsTrigger>
          <TabsTrigger value="hof">Hall of Fame</TabsTrigger>
        </TabsList>

        {/* DAILY TAB */}
        <TabsContent value="daily" className="space-y-6">
          <EntityFilters />
          
          {dailyQuery.isLoading ? (
            <div className="flex justify-center py-12">Loading...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(entityFilter === 'all' || entityFilter === 'manufacturer') && (
                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Manufacturers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={dailyQuery.data?.manufacturers || []} icon={TrendingUp} />
                  </CardContent>
                </Card>
              )}

              {(entityFilter === 'all' || entityFilter === 'pharmacy') && (
                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Pharmacies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={dailyQuery.data?.pharmacies || []} icon={Users} />
                  </CardContent>
                </Card>
              )}

              {(entityFilter === 'all' || entityFilter === 'brand') && (
                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Brands</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={dailyQuery.data?.brands || []} icon={Medal} />
                  </CardContent>
                </Card>
              )}

              {(entityFilter === 'all' || entityFilter === 'product') && (
                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList
                      title=""
                      data={dailyQuery.data?.products || []}
                      icon={Trophy}
                      emptyMessage="No product scores yet for this date. Data is still syncing."
                    />
                  </CardContent>
                </Card>
              )}

              {(entityFilter === 'all' || entityFilter === 'strain') && (
                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Flower</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={dailyQuery.data?.strains || []} icon={Trophy} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* WEEKLY TAB */}
        <TabsContent value="weekly" className="space-y-6">
          {weeklyQuery.isLoading ? (
            <div className="flex justify-center py-12">Loading...</div>
          ) : (
            <>
              {weeklyQuery.data && (
                <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
                  <span>Week {weeklyQuery.data.week}, {weeklyQuery.data.year}</span>
                </div>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Manufacturers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={weeklyQuery.data?.manufacturers || []} icon={TrendingUp} />
                  </CardContent>
                </Card>

                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Pharmacies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={weeklyQuery.data?.pharmacies || []} icon={Users} />
                  </CardContent>
                </Card>

                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Brands</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={weeklyQuery.data?.brands || []} icon={Medal} />
                  </CardContent>
                </Card>

                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList
                      title=""
                      data={weeklyQuery.data?.products || []}
                      icon={Trophy}
                      emptyMessage="No product scores yet for this week."
                    />
                  </CardContent>
                </Card>

                <Card className={cardBase}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Flower</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityList title="" data={weeklyQuery.data?.strains || []} icon={Trophy} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* HALL OF FAME TAB */}
        <TabsContent value="hof" className="space-y-8">
          {hallOfFameQuery.isLoading ? (
            <div className="flex justify-center py-12">Loading...</div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
              <Card className={cn(cardBase, "border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent")}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <div>
                      <CardTitle>Season Legends</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Highest total season points</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TeamList data={hallOfFameQuery.data?.seasonLeaders || []} type="season" />
                </CardContent>
              </Card>

              <Card className={cn(cardBase, "border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent")}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                    <div>
                      <CardTitle>Weekly High Scores</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Best single week performances</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TeamList data={hallOfFameQuery.data?.weeklyHighScores || []} type="weekly" />
                </CardContent>
              </Card>

              <Card className={cn(cardBase, "border-weed-green/30 bg-gradient-to-br from-weed-green/10 to-transparent")}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-weed-green" />
                    <div>
                      <CardTitle>Top Squads</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Streak leaders from the daily game</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TopSquadsList
                    players={topSquadsQuery.data?.leaderboard || []}
                    loading={topSquadsQuery.isLoading}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;

