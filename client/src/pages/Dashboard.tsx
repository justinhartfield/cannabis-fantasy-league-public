import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Trophy, Plus, UserCircle, TrendingUp, Calendar, Zap, Loader2, Activity } from "lucide-react";
import { Link } from "wouter";
import { APP_TITLE, getLoginUrl } from "@/const";
import { StatBadge } from "@/components/StatBadge";
import { LiveScoreCard } from "@/components/LiveScoreCard";
import { LeagueCard } from "@/components/LeagueCard";

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

  const seasonLeagues = myLeagues?.filter(l => l.leagueType !== 'challenge') || [];
  const challengeLeagues = myLeagues?.filter(l => l.leagueType === 'challenge') || [];
  const hasLeagues = seasonLeagues.length > 0;

  return (
    <div className="min-h-screen">
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
            <Card className="bg-weed-coral border-0 card-hover-lift cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-white" />
                      Create New League
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Start a season-long fantasy experience
                    </CardDescription>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-weed-green flex items-center justify-center">
                    <Plus className="w-6 h-6 text-black" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/league/create?type=challenge">
            <Card className="bg-weed-purple border-0 card-hover-lift cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-weed-green" />
                      Daily Challenge
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      24-hour head-to-head battles
                    </CardDescription>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-weed-green flex items-center justify-center">
                    <Plus className="w-6 h-6 text-black" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Prediction Streak Game Mode */}
        <section className="mb-8">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-foreground mb-2">
              Daily Prediction Streak
            </h3>
            <p className="text-sm text-muted-foreground">
              Test your cannabis market knowledge with daily head-to-head predictions
            </p>
          </div>
          
          <Link href="/prediction-streak">
            <Card className="bg-weed-pink border-0 card-hover-lift cursor-pointer overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                      <Zap className="w-6 h-6 text-weed-pink" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">
                        Play Today's Matchups
                      </h4>
                      <p className="text-sm text-white/80">
                        Current Streak: {user?.currentPredictionStreak || 0} 🔥 | 
                        Best: {user?.longestPredictionStreak || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">
                      7
                    </span>
                    <p className="text-xs text-white/80">matchups daily</p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </section>

        {/* My Leagues */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground">My Leagues</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasLeagues ? `${seasonLeagues.length} active ${seasonLeagues.length === 1 ? 'league' : 'leagues'}` : "Get started with your first league"}
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
              {myLeagues?.filter(league => league.leagueType !== 'challenge').map((league) => (
                <LeagueCard key={league.id} league={league} />
              ))}
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
                <LeagueCard key={league.id} league={league} />
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
