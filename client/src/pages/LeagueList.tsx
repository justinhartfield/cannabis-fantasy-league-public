import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Trophy, ArrowLeft, Loader2, UserCircle, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function LeagueList() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [joinCode, setJoinCode] = useState("");

  const { data: leagues, isLoading } = trpc.league.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const joinLeague = trpc.league.joinByCode.useMutation({
    onSuccess: (data) => {
      toast.success("Erfolgreich der Liga beigetreten!");
      setJoinCode("");
      const path =
        data.leagueType === "challenge"
          ? `/challenge/${data.leagueId}`
          : `/league/${data.leagueId}`;
      setLocation(path);
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Beitreten");
    },
  });

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Bitte gib einen Liga-Code ein");
      return;
    }
    await joinLeague.mutateAsync({ leagueCode: joinCode.trim().toUpperCase() });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Meine Ligen</h1>
                <p className="text-sm text-muted-foreground">
                  {leagues?.length || 0} {leagues?.length === 1 ? "Liga" : "Ligen"}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/league/create">
                <Plus className="w-4 h-4 mr-2" />
                Neue Liga
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Join League Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Search className="w-5 h-5" />
                Liga beitreten
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Gib den Liga-Code ein, um einer bestehenden Liga beizutreten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinLeague} className="flex gap-3">
                <Input
                  placeholder="Liga-Code eingeben"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1"
                  maxLength={8}
                />
                <Button type="submit" disabled={joinLeague.isPending || !joinCode.trim()}>
                  {joinLeague.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Beitrete...
                    </>
                  ) : (
                    "Beitreten"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Leagues List */}
          {leagues && leagues.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Deine Ligen</h2>
              <div className="grid gap-4">
                {leagues.map((league: any) => {
                  const userTeam = league.teams?.find((t: any) => t.userId === user?.id);
                  const isCommissioner = league.commissionerId === user?.id;

                  const targetPath =
                    league.leagueType === "challenge"
                      ? `/challenge/${league.id}`
                      : `/league/${league.id}`;

                  return (
                    <Card
                      key={league.id}
                      className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(targetPath)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Trophy className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-foreground truncate">
                                  {league.name}
                                </h3>
                                {isCommissioner && (
                                  <Badge
                                    variant="outline"
                                    className="bg-primary/10 text-primary border-primary"
                                  >
                                    Commissioner
                                  </Badge>
                                )}
                              </div>
                              {league.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {league.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <UserCircle className="w-4 h-4" />
                                  <span>
                                    {league.teams?.length || 0} / {league.maxTeams} Teams
                                  </span>
                                </div>
                                {userTeam && (
                                  <div>
                                    <span className="text-foreground font-medium">
                                      {userTeam.teamName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              variant={league.status === "active" ? "default" : "secondary"}
                            >
                              {league.status === "active" ? "Aktiv" : league.status}
                            </Badge>
                            {league.currentWeek && (
                              <span className="text-xs text-muted-foreground">
                                Woche {league.currentWeek}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Trophy className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Noch keine Ligen
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Erstelle deine erste Liga oder tritt einer bestehenden bei
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button asChild>
                      <Link href="/league/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Liga erstellen
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
