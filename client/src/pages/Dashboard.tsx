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

/**
 * Dashboard - Weed.de 2026 Reskin with Wayfinder Illustrations
 * 
 * Bold, playful dashboard featuring Wayfinder character illustrations,
 * Weed.de brand colors, and modern typography.
 */
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
      <div className="min-h-screen bg-weed-cream dark:bg-weed-burgundy flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-weed-green" />
      </div>
    );
  }

  const seasonLeagues = myLeagues?.filter(l => l.leagueType !== 'challenge') || [];
  const challengeLeagues = myLeagues?.filter(l => l.leagueType === 'challenge') || [];
  const hasLeagues = seasonLeagues.length > 0;

  // Wayfinder character assignments for stats
  const statCards = [
    {
      label: "Manufacturers",
      value: stats?.manufacturerCount || 0,
      character: "/assets/illustrations/World_Sticker_Alpha.gif",
      bgColor: "bg-weed-coral",
      textColor: "text-white"
    },
    {
      label: "Strains",
      value: stats?.cannabisStrainCount || 0,
      character: "/assets/illustrations/Ice-Cream_Sticker_Alpha.gif",
      bgColor: "bg-weed-green",
      textColor: "text-black"
    },
    {
      label: "Products",
      value: stats?.productCount || stats?.strainCount || 0,
      character: "/assets/illustrations/Pancake_Sticker_Alpha.gif",
      bgColor: "bg-weed-purple",
      textColor: "text-white"
    },
    {
      label: "Pharmacies",
      value: stats?.pharmacyCount || 0,
      character: "/assets/illustrations/Pillow_Sticker_Alpha.gif",
      bgColor: "bg-weed-pink",
      textColor: "text-white"
    },
    {
      label: "Brands",
      value: stats?.brandCount || 0,
      character: "/assets/illustrations/World_Sticker_Alpha.gif",
      bgColor: "bg-weed-burgundy",
      textColor: "text-white"
    }
  ];

  return (
    <div className="min-h-screen bg-weed-cream dark:bg-weed-burgundy pattern-dots">
      {/* Floating Background Characters */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10 dark:opacity-5">
        <img
          src="/assets/illustrations/World_Sticker_Alpha.gif"
          alt=""
          className="absolute top-20 left-10 w-32 h-32 animate-float"
          style={{ animationDelay: '0s', animationDuration: '8s' }}
        />
        <img
          src="/assets/illustrations/Ice-Cream_Sticker_Alpha.gif"
          alt=""
          className="absolute top-40 right-20 w-28 h-28 animate-float"
          style={{ animationDelay: '2s', animationDuration: '9s' }}
        />
        <img
          src="/assets/illustrations/Pancake_Sticker_Alpha.gif"
          alt=""
          className="absolute bottom-40 left-20 w-32 h-32 animate-float"
          style={{ animationDelay: '4s', animationDuration: '10s' }}
        />
        <img
          src="/assets/illustrations/Pillow_Sticker_Alpha.gif"
          alt=""
          className="absolute bottom-20 right-10 w-28 h-28 animate-float"
          style={{ animationDelay: '1s', animationDuration: '7s' }}
        />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Platform Statistics with Wayfinder Characters */}
        {stats && (stats.manufacturerCount > 0 || stats.cannabisStrainCount > 0 || stats.pharmacyCount > 0) && (
          <div className="mb-8">
            <h3 className="headline-secondary text-xl mb-6 text-foreground dark:text-white">
              Platform Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {statCards.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`${stat.bgColor} ${stat.textColor} rounded-2xl p-6 relative overflow-hidden group hover:scale-105 transition-transform duration-300 cursor-pointer shadow-lg`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Stat Content */}
                  <div className="relative z-10">
                    <p className="text-xs uppercase tracking-wide font-bold opacity-90 mb-2">
                      {stat.label}
                    </p>
                    <p className="headline-primary text-4xl mb-4">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Wayfinder Character */}
                  <img
                    src={stat.character}
                    alt=""
                    className="absolute bottom-2 right-2 w-12 h-12 opacity-30 group-hover:opacity-50 group-hover:scale-125 transition-all duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions with Large Wayfinder Characters */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link href="/league/create">
            <Card className="bg-weed-coral border-0 hover:scale-[1.02] transition-transform duration-300 cursor-pointer h-full shadow-xl overflow-hidden relative group">
              <div className="absolute inset-0 pattern-dots opacity-20"></div>
              <CardHeader className="relative z-10 pb-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <CardTitle className="headline-secondary text-white text-2xl mb-3">
                      📋 CREATE NEW LEAGUE
                    </CardTitle>
                    <CardDescription className="text-white/90 text-base">
                      Start a season-long fantasy experience
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <Button size="lg" className="bg-weed-green hover:bg-weed-green/90 text-black font-bold uppercase">
                    Start Now →
                  </Button>
                  <img
                    src="/assets/illustrations/World_Sticker_Alpha.gif"
                    alt=""
                    className="w-24 h-24 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300"
                  />
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/league/create?type=challenge">
            <Card className="bg-weed-purple border-0 hover:scale-[1.02] transition-transform duration-300 cursor-pointer h-full shadow-xl overflow-hidden relative group">
              <div className="absolute inset-0 pattern-grid opacity-20"></div>
              <CardHeader className="relative z-10 pb-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <CardTitle className="headline-secondary text-white text-2xl mb-3">
                      ⚡ DAILY CHALLENGE
                    </CardTitle>
                    <CardDescription className="text-white/90 text-base">
                      24-hour head-to-head battles
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <Button size="lg" className="bg-weed-green hover:bg-weed-green/90 text-black font-bold uppercase">
                    Play Now →
                  </Button>
                  <img
                    src="/assets/illustrations/Ice-Cream_Sticker_Alpha.gif"
                    alt=""
                    className="w-24 h-24 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300"
                  />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Prediction Streak with Pancake Character */}
        <section className="mb-8">
          <div className="mb-4">
            <h3 className="headline-secondary text-2xl text-foreground dark:text-white mb-2">
              Daily Prediction Streak
            </h3>
            <p className="text-sm text-muted-foreground dark:text-white/70">
              Test your cannabis market knowledge with daily head-to-head predictions
            </p>
          </div>
          
          <Link href="/prediction-streak">
            <Card className="bg-weed-pink border-0 hover:scale-[1.01] transition-transform duration-300 cursor-pointer overflow-hidden shadow-xl relative group">
              <div className="absolute inset-0 pattern-dots opacity-20"></div>
              <div className="p-6 relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                      <Zap className="w-8 h-8 text-weed-pink" />
                    </div>
                    <div>
                      <h4 className="headline-tertiary text-xl text-white mb-1">
                        Play Today's Matchups
                      </h4>
                      <p className="text-sm text-white/90 font-medium">
                        Current Streak: {user?.currentPredictionStreak || 0} 🔥 | 
                        Best: {user?.longestPredictionStreak || 0} 🏆
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="headline-primary text-5xl text-white">
                        7
                      </span>
                      <p className="text-xs text-white/80 uppercase tracking-wide font-bold">matchups daily</p>
                    </div>
                    <img
                      src="/assets/illustrations/Pancake_Sticker_Alpha.gif"
                      alt=""
                      className="w-20 h-20 group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </section>

        {/* My Leagues with Character Mascots */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="headline-secondary text-2xl text-foreground dark:text-white">My Leagues</h3>
              <p className="text-sm text-muted-foreground dark:text-white/70 mt-1">
                {hasLeagues ? `${seasonLeagues.length} active ${seasonLeagues.length === 1 ? 'league' : 'leagues'}` : "Get started with your first league"}
              </p>
            </div>
            {hasLeagues && (
              <Button variant="outline" asChild className="border-weed-green/50 hover:bg-weed-green/10">
                <Link href="/leagues">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Browse All
                </Link>
              </Button>
            )}
          </div>

          {!hasLeagues ? (
            <Card className="bg-white dark:bg-weed-purple border-0 shadow-xl">
              <CardContent className="py-16">
                <div className="text-center space-y-6 max-w-md mx-auto">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-2xl bg-weed-green mx-auto flex items-center justify-center shadow-lg">
                      <Trophy className="w-12 h-12 text-black" />
                    </div>
                    <img
                      src="/assets/illustrations/World_Sticker_Alpha.gif"
                      alt=""
                      className="absolute -top-4 -right-4 w-16 h-16"
                    />
                  </div>
                  <div>
                    <h4 className="headline-secondary text-3xl text-foreground dark:text-white mb-3">
                      Ready to Compete?
                    </h4>
                    <p className="text-muted-foreground dark:text-white/70 mb-8">
                      Create your first league or join an existing one to start your fantasy journey.
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Button asChild size="lg" className="font-bold uppercase">
                        <Link href="/league/create">
                          <Plus className="w-4 h-4 mr-2" />
                          Create League
                        </Link>
                      </Button>
                      <Button variant="outline" asChild size="lg" className="border-weed-green/50 font-bold uppercase">
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
              {myLeagues?.filter(league => league.leagueType !== 'challenge').map((league, index) => {
                // Assign rotating Wayfinder characters to leagues
                const characters = [
                  "/assets/illustrations/World_Sticker_Alpha.gif",
                  "/assets/illustrations/Ice-Cream_Sticker_Alpha.gif",
                  "/assets/illustrations/Pancake_Sticker_Alpha.gif",
                  "/assets/illustrations/Pillow_Sticker_Alpha.gif"
                ];
                const characterIndex = index % characters.length;
                
                return (
                  <div key={league.id} className="relative">
                    {/* Wayfinder Character Badge */}
                    <div className="absolute -top-3 -right-3 z-20">
                      <img
                        src={characters[characterIndex]}
                        alt=""
                        className="w-16 h-16 drop-shadow-lg"
                      />
                    </div>
                    <LeagueCard league={league} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Challenges with Character Icons */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="headline-secondary text-2xl text-foreground dark:text-white">My Challenges</h3>
              <p className="text-sm text-muted-foreground dark:text-white/70 mt-1">Quick daily competitions</p>
            </div>
          </div>

          {myLeagues && myLeagues.filter(l => l.leagueType === 'challenge').length > 0 ? (
            <div className="grid gap-4">
              {myLeagues.filter(l => l.leagueType === 'challenge').map((league, index) => {
                const characters = [
                  "/assets/illustrations/Pillow_Sticker_Alpha.gif",
                  "/assets/illustrations/World_Sticker_Alpha.gif",
                  "/assets/illustrations/Ice-Cream_Sticker_Alpha.gif",
                  "/assets/illustrations/Pancake_Sticker_Alpha.gif"
                ];
                const characterIndex = index % characters.length;
                
                return (
                  <div key={league.id} className="relative">
                    <div className="absolute -top-3 -left-3 z-20">
                      <img
                        src={characters[characterIndex]}
                        alt=""
                        className="w-12 h-12 drop-shadow-lg"
                      />
                    </div>
                    <LeagueCard league={league} />
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="bg-white dark:bg-weed-purple border-0 shadow-xl">
              <CardContent className="py-12">
                <div className="text-center max-w-sm mx-auto">
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-weed-green/20 mx-auto flex items-center justify-center">
                      <Zap className="w-8 h-8 text-weed-green" />
                    </div>
                    <img
                      src="/assets/illustrations/Pillow_Sticker_Alpha.gif"
                      alt=""
                      className="absolute -bottom-2 -right-2 w-12 h-12"
                    />
                  </div>
                  <p className="text-foreground dark:text-white mb-2 font-bold">No Active Challenges</p>
                  <p className="text-sm text-muted-foreground dark:text-white/70">
                    New daily challenges are created automatically at 8:00 AM
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Floating Animation Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-5deg);
          }
          75% {
            transform: translateY(-15px) rotate(3deg);
          }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
