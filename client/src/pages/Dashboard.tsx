import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Trophy, Plus, UserCircle, TrendingUp, Calendar, Zap, Loader2, Activity } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE, getLoginUrl } from "@/const";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatBadge } from "@/components/StatBadge";
import { LiveScoreCard } from "@/components/LiveScoreCard";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: myLeagues, isLoading: leaguesLoading } = trpc.league.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch platform statistics
  const { data: stats } = trpc.stats.getStats.useQuery();

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (authLoading || leaguesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasLeagues = myLeagues && myLeagues.length > 0;

  return (
    <div className="min-h-screen gradient-dark">
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 gradient-primary opacity-10 blur-3xl" />
        <div className="container mx-auto px-4 py-8 relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary">{APP_TITLE}</h1>
                <p className="text-sm text-muted-foreground mt-1">Fantasy League Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 border border-border/50">
                <UserCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {user?.name || user?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Welcome */}
          <div className="text-center py-8">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              Welcome back, {user?.name?.split(" ")[0] || "Champion"}!
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track your leagues, manage your lineup, and dominate the competition
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Platform Statistics */}
        {stats && (stats.manufacturerCount > 0 || stats.cannabisStrainCount > 0 || stats.pharmacyCount > 0) && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Platform Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              <StatBadge
                label="Manufacturers"
                value={stats.manufacturerCount}
                variant="primary"
                icon={Activity}
              />
              <StatBadge
                label="Strains"
                value={stats.cannabisStrainCount || 0}
                variant="green"
                icon={Activity}
              />
              <StatBadge
                label="Products"
                value={stats.productCount || stats.strainCount}
                variant="purple"
                icon={Activity}
              />
              <StatBadge
                label="Pharmacies"
                value={stats.pharmacyCount}
                variant="amber"
                icon={Activity}
              />
              <StatBadge
                label="Brands"
                value={stats.brandCount || 0}
                variant="secondary"
                icon={Activity}
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link href="/league/create">
            <Card className="gradient-card border-border/50 card-hover-lift cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-[#FF2D55]" />
                      Create New League
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Start a season-long fantasy experience
                    </CardDescription>
                  </div>
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Card className="gradient-card border-border/50 h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-[#00D9FF]" />
                    Daily Challenge
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    24-hour head-to-head battles
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">New challenge</p>
                  <p className="text-xs text-[#00D9FF]">Daily at 8:00 AM</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* My Leagues */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground">My Leagues</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasLeagues ? `${myLeagues?.length} active leagues` : "Get started with your first league"}
              </p>
            </div>
            {hasLeagues && (
              <Button variant="outline" asChild className="border-border/50">
                <Link href="/leagues">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Browse Leagues
                </Link>
              </Button>
            )}
          </div>

          {!hasLeagues ? (
            <Card className="gradient-card border-border/50">
              <CardContent className="py-16">
                <div className="text-center space-y-6 max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-2xl gradient-primary mx-auto flex items-center justify-center glow-primary">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-foreground mb-3">
                      Ready to Compete?
                    </h4>
                    <p className="text-muted-foreground mb-8">
                      Create your first league or join an existing one to start your fantasy journey.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button asChild className="gradient-primary">
                        <Link href="/league/create">
                          <Plus className="w-4 h-4 mr-2" />
                          Create League
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="border-border/50">
                        <Link href="/leagues">
                          <UserCircle className="w-4 h-4 mr-2" />
                          Browse Leagues
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myLeagues?.map((league) => {
                const leaguePath = league.leagueType === 'challenge' 
                  ? `/challenge/${league.id}` 
                  : `/league/${league.id}`;
                return (
                <Link key={league.id} href={leaguePath}>
                  <Card className="gradient-card border-border/50 card-hover-lift cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <CardTitle className="text-foreground text-xl mb-2">
                            {league.name}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {league.myTeam?.teamName}
                          </CardDescription>
                        </div>
                        {league.commissionerId === user?.id && (
                          <span className="px-2 py-1 rounded-lg text-xs gradient-primary text-white font-bold uppercase">
                            Comm
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* My Team Stats - Prominent */}
                      {league.myTeam && (
                        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Your Rank</span>
                            <div className="flex items-center gap-1">
                              <div className={`text-2xl font-bold ${
                                (league.myTeam.rank || 999) <= 3 ? 'text-gradient-primary' : 'text-foreground'
                              }`}>
                                #{league.myTeam.rank || "-"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Total Points</span>
                            <span className="text-lg font-bold text-[#00D9FF]">
                              {league.myTeam.totalPoints?.toFixed(1) || "0.0"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* League Info */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-semibold text-foreground capitalize">
                            {league.seasonStatus === "pre_draft"
                              ? "Pre-Draft"
                              : league.seasonStatus === "drafting"
                              ? "Drafting"
                              : league.seasonStatus === "in_progress"
                              ? "Active"
                              : league.seasonStatus === "playoffs"
                              ? "Playoffs"
                              : "Complete"}
                          </span>
                        </div>

                        {(league.seasonStatus === "in_progress" || league.seasonStatus === "playoffs") && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Week</span>
                            <span className="font-semibold text-foreground">
                              {league.currentWeek} / 18
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Teams</span>
                          <span className="font-semibold text-foreground">
                            {league.maxTeams}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* My Challenges */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground">My Challenges</h3>
              <p className="text-sm text-muted-foreground mt-1">Quick daily competitions</p>
            </div>
          </div>

          {myLeagues && myLeagues.filter(l => l.leagueType === 'challenge').length > 0 ? (
            <div className="grid gap-4">
              {myLeagues.filter(l => l.leagueType === 'challenge').map((league) => (
                <Link key={league.id} href={`/challenge/${league.id}`}>
                  <Card className="gradient-card border-border/50 card-hover-lift cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg text-foreground mb-1">
                            {league.name}
                          </CardTitle>
                          <CardDescription>
                            {league.teamCount} Teams • {league.status === 'active' ? 'Active' : 'Draft'}
                          </CardDescription>
                        </div>
                        <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="gradient-card border-border/50">
              <CardContent className="py-12">
                <div className="text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 mx-auto mb-4 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground mb-2 font-semibold">No Active Challenges</p>
                  <p className="text-sm text-muted-foreground">
                    New daily challenges are created automatically at 8:00 AM
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
