import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Trophy, Plus, UserCircle, TrendingUp, Calendar, Zap, Loader2 } from "@/lib/icons";
import { Link } from "wouter";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{APP_TITLE}</h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Willkommen zurück, {user?.name?.split(" ")[0] || "Champion"}!
          </h2>
          <p className="text-muted-foreground">
            Verwalte deine Ligen und Challenges oder erstelle neue.
          </p>
        </div>

        {/* Platform Statistics */}
        {stats && (stats.manufacturerCount > 0 || stats.cannabisStrainCount > 0 || stats.pharmacyCount > 0) && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Hersteller</p>
                  <p className="text-3xl font-bold text-foreground">{stats.manufacturerCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Cannabis Strains</p>
                  <p className="text-3xl font-bold text-foreground">{stats.cannabisStrainCount || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Genetik/Sorten</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Produkte</p>
                  <p className="text-3xl font-bold text-foreground">{stats.productCount || stats.strainCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pharma-Produkte</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Apotheken</p>
                  <p className="text-3xl font-bold text-foreground">{stats.pharmacyCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Brands</p>
                  <p className="text-3xl font-bold text-foreground">{stats.brandCount || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Marketing</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
            <Link href="/league/create">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-card-foreground flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Neue Saison-Liga
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Starte eine jahreslanges Fantasy-Erlebnis
                    </CardDescription>
                  </div>
                  <Plus className="w-8 h-8 text-primary" />
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20 hover:border-accent/40 transition-colors cursor-pointer">
            <Link href="/challenge/create">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-card-foreground flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Neue Wochen-Challenge
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Schnelle Einzel-Woche Battle
                    </CardDescription>
                  </div>
                  <Plus className="w-8 h-8 text-accent" />
                </div>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* My Leagues */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-foreground">Meine Ligen</h3>
            {hasLeagues && (
              <Button variant="outline" asChild>
                <Link href="/leagues">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Ligen beitreten
                </Link>
              </Button>
            )}
          </div>

          {!hasLeagues ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">
                      Noch keine Ligen
                    </h4>
                    <p className="text-muted-foreground mb-6">
                      Erstelle deine erste Liga oder tritt einer bestehenden bei.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button asChild>
                        <Link href="/league/create">
                          <Plus className="w-4 h-4 mr-2" />
                          Liga erstellen
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/leagues">
                          <UserCircle className="w-4 h-4 mr-2" />
                          Ligen durchsuchen
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myLeagues?.map((league) => (
                <Link key={league.id} href={`/league/${league.id}`}>
                  <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-card-foreground text-lg mb-1">
                            {league.name}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground text-sm">
                            {league.myTeam?.teamName}
                          </CardDescription>
                        </div>
                        {league.commissionerId === user?.id && (
                          <span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary font-medium">
                            Commissioner
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* League Status */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium text-foreground capitalize">
                            {league.seasonStatus === "pre_draft"
                              ? "Vor Draft"
                              : league.seasonStatus === "drafting"
                              ? "Drafting"
                              : league.seasonStatus === "in_progress"
                              ? "Laufend"
                              : league.seasonStatus === "playoffs"
                              ? "Playoffs"
                              : "Beendet"}
                          </span>
                        </div>

                        {/* Current Week */}
                        {league.seasonStatus === "in_progress" || league.seasonStatus === "playoffs" ? (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Woche:</span>
                            <span className="font-medium text-foreground">
                              {league.currentWeek} / 18
                            </span>
                          </div>
                        ) : null}

                        {/* Team Count */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Teams:</span>
                          <span className="font-medium text-foreground">
                            {league.maxTeams} Teams
                          </span>
                        </div>

                        {/* My Team Stats */}
                        {league.myTeam && (
                          <div className="pt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span className="text-sm text-muted-foreground">
                                  Mein Rang:
                                </span>
                              </div>
                              <span className="text-lg font-bold text-primary">
                                #{league.myTeam.rank || "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm text-muted-foreground">
                                Punkte:
                              </span>
                              <span className="text-sm font-medium text-foreground">
                                {league.myTeam.totalPoints?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Challenges */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-foreground">Meine Challenges</h3>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Noch keine aktiven Challenges</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/challenge/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Challenge erstellen
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
