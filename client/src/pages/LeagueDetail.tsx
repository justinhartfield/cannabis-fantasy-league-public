import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Calendar, Settings, Copy, Check, Play, UserCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { LeagueNav } from "@/components/LeagueNav";

export default function LeagueDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: league, isLoading } = trpc.league.getById.useQuery(
    { leagueId: parseInt(id!) },
    { enabled: !!id && isAuthenticated }
  );

  const startDraftMutation = trpc.draft.startDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft wurde gestartet!");
      setLocation(`/league/${id}/draft`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Starten des Drafts: ${error.message}`);
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

  if (!league) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Liga nicht gefunden</h2>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCommissioner = league.commissionerUserId === user?.id;
  const userTeam = league.teams?.find((team: any) => team.userId === user?.id);

  const copyLeagueCode = () => {
    navigator.clipboard.writeText(league.leagueCode);
    setCopied(true);
    toast.success("Liga-Code kopiert!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartDraft = () => {
    startDraftMutation.mutate({ leagueId: parseInt(id) });
  };

  return (
    <div className="min-h-screen bg-background">
      <LeagueNav
        leagueId={parseInt(id)}
        leagueName={league.name}
        teamCount={league.teams?.length || 0}
        maxTeams={league.maxTeams}
        isCommissioner={isCommissioner}
        hasTeam={!!userTeam}
        currentPage="overview"
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - League Info */}
          <div className="md:col-span-2 space-y-6">
            {/* League Details Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Liga-Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {league.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Beschreibung</p>
                    <p className="text-foreground">{league.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Maximale Teams</p>
                    <p className="text-foreground font-medium">{league.maxTeams}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Playoff Teams</p>
                    <p className="text-foreground font-medium">{league.playoffTeams}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Scoring-System</p>
                    <p className="text-foreground font-medium capitalize">{league.scoringSystem}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Waiver-System</p>
                    <p className="text-foreground font-medium uppercase">{league.waiverType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">FAAB Budget</p>
                    <p className="text-foreground font-medium">{league.faabBudget}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Trade Deadline</p>
                    <p className="text-foreground font-medium">Woche {league.tradeDeadlineWeek}</p>
                  </div>
                </div>

                {league.draftDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Draft-Datum</p>
                    <p className="text-foreground font-medium">
                      {new Date(league.draftDate).toLocaleString("de-DE")}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant={league.isPublic ? "default" : "secondary"}>
                    {league.isPublic ? "Öffentlich" : "Privat"}
                  </Badge>
                  <Badge variant={league.status === "active" ? "default" : "secondary"}>
                    {league.status === "active" ? "Aktiv" : league.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Teams List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  Teams ({league.teams?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {league.teams && league.teams.length > 0 ? (
                  <div className="space-y-3">
                    {league.teams.map((team: any) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{team.teamName}</p>
                            <p className="text-sm text-muted-foreground">
                              {team.userId === league.commissionerId && "Commissioner • "}
                              {team.userId === user?.id && "Dein Team"}
                            </p>
                          </div>
                        </div>
                        {team.userId === user?.id && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                            Du
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Noch keine Teams</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Invite Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Freunde einladen</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Teile diesen Code mit deinen Freunden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-background border border-border rounded-md font-mono text-sm text-foreground">
                    {league.leagueCode}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyLeagueCode}>
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Andere können mit diesem Code der Liga beitreten
                </p>
              </CardContent>
            </Card>

            {/* Draft Actions for Members */}
            {!isCommissioner && userTeam && league.draftStarted && !league.draftCompleted && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Draft</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Der Draft läuft gerade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation(`/league/${league.id}/draft`)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Zum Draft
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Commissioner Actions */}
            {isCommissioner && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Commissioner-Aktionen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!league.draftStarted && (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => setLocation(`/league/${league.id}/pre-draft`)}
                        disabled={!league.teams || league.teams.length < 2}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Setup Draft
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {league.teams && league.teams.length < 2
                          ? "Mindestens 2 Teams benötigt für Draft"
                          : "Bereit zum Draft Setup"}
                      </p>
                    </>
                  )}
                  {league.draftStarted && !league.draftCompleted && (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => setLocation(`/league/${league.id}/draft`)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Go to Draft
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Draft in progress...
                      </p>
                    </>
                  )}
                  {league.draftCompleted && (
                    <>
                      <Badge variant="outline" className="w-full justify-center py-2">
                        ✅ Draft Complete
                      </Badge>
                      <p className="text-xs text-muted-foreground text-center">
                        League is now active
                      </p>
                    </>
                  )}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/league/${league.id}/settings`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Einstellungen
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* My Team Card */}
            {userTeam && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Mein Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Team-Name</p>
                    <p className="text-foreground font-medium">{userTeam.teamName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">FAAB verbleibend</p>
                    <p className="text-foreground font-medium">{userTeam.faabRemaining}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Waiver-Priorität</p>
                    <p className="text-foreground font-medium">{userTeam.waiverPriority}</p>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/league/${id}/lineup`}>
                        Lineup bearbeiten
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/team/${userTeam.id}`}>
                        Team verwalten
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
