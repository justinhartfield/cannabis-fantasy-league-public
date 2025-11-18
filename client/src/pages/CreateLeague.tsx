import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Trophy, ArrowLeft, Loader2, Calendar, UserCircle, Settings } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function CreateLeague() {
  const [location, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const createLeague = trpc.league.create.useMutation();

  // Parse query parameter to preset leagueType
  const getInitialLeagueType = (): "season" | "challenge" => {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get("type");
    return type === "challenge" ? "challenge" : "season";
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxTeams: 10,
    draftDate: "",
    scoringSystem: "standard" as "standard" | "ppr" | "custom",
    waiverType: "faab" as "faab" | "rolling",
    faabBudget: 100,
    tradeDeadlineWeek: 13,
    playoffTeams: 6,
    isPublic: false,
    leagueType: getInitialLeagueType(),
  });

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Bitte gib einen Liga-Namen ein");
      return;
    }

    if (formData.name.trim().length < 3) {
      toast.error("Liga-Name muss mindestens 3 Zeichen lang sein");
      return;
    }

    try {
      const result = await createLeague.mutateAsync(formData);
      toast.success("Liga erfolgreich erstellt!");
      const destination =
        (result.leagueType || formData.leagueType) === "challenge"
          ? `/challenge/${result.leagueId}`
          : `/league/${result.leagueId}`;
      setLocation(destination);
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen der Liga");
    }
  };

  return (
    <div className="min-h-screen bg-weed-cream relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pattern-dots opacity-30 pointer-events-none"></div>
      {/* Header */}
      <header className="border-b-4 border-weed-green bg-white shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src="https://framerusercontent.com/images/DPZRbKFGVJYTZGxHxKNNHYDMc.gif" alt="Trophy" className="w-12 h-12" />
                <div>
                  <h1 className="headline-primary uppercase text-foreground">Neue Liga erstellen</h1>
                  <p className="text-sm text-muted-foreground">
                    {formData.leagueType === "season" ? "Saison-Modus" : "Daily Challenge"}
                  </p>
                </div>
              </div>
            </div>
            {/* Wayfinder Character */}
            <img 
              src="https://framerusercontent.com/images/NbcObVXzQHvPqgg7j0Lqz8Oc.gif" 
              alt="Wayfinder World" 
              className="w-20 h-20 object-contain"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-white border-2 border-weed-green shadow-xl">
            <CardHeader>
              <CardTitle className="headline-secondary text-foreground flex items-center gap-2 uppercase">
                <Settings className="w-5 h-5 text-weed-green" />
                Grundeinstellungen
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Lege die grundlegenden Informationen für deine Liga fest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* League Type Toggle */}
              <div className="space-y-2">
                <Label>Liga-Typ</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, leagueType: "season" })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.leagueType === "season"
                        ? "border-weed-green bg-weed-green/10"
                        : "border-gray-300 hover:border-weed-green/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Trophy className="w-6 h-6" />
                      <span className="font-semibold">Saison-Liga</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Volle Saison mit Draft und Trades
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, leagueType: "challenge" })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.leagueType === "challenge"
                        ? "border-weed-green bg-weed-green/10"
                        : "border-gray-300 hover:border-weed-green/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="w-6 h-6" />
                      <span className="font-semibold">Daily Challenge</span>
                      <span className="text-xs text-muted-foreground text-center">
                        24h Kopf-an-Kopf Wettbewerb
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Liga-Name * (mindestens 3 Zeichen)</Label>
                <Input
                  id="name"
                  placeholder="z.B. Cannabis Champions 2025"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  minLength={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Beschreibe deine Liga..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {formData.leagueType === "season" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxTeams">Maximale Teams</Label>
                  <Select
                    value={formData.maxTeams.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, maxTeams: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 6, 8, 10, 12, 14, 16].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Teams
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playoffTeams">Playoff Teams</Label>
                  <Select
                    value={formData.playoffTeams.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, playoffTeams: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 6, 8].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Teams
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formData.leagueType === "challenge" && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Daily Challenge:</strong> 2 Spieler, 10-Asset Squads, 24h Wettbewerb.
                    Keine Draft-Phase - direkte Lineup-Auswahl.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Roster Structure Info */}
          <Card className="bg-white border-2 border-weed-green shadow-xl">
            <CardHeader>
              <CardTitle className="headline-secondary text-foreground flex items-center gap-2 uppercase">
                <UserCircle className="w-5 h-5 text-weed-green" />
                Roster-Struktur
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Jedes Team hat 10 Roster-Plätze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Der Draft besteht aus <strong>10 Runden</strong>. Jedes Team wählt folgende Positionen:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">2×</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Hersteller</div>
                      <div className="text-xs text-muted-foreground">MFG</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-600">2×</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Cannabis Strains</div>
                      <div className="text-xs text-muted-foreground">CSTR</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-600">2×</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Produkte</div>
                      <div className="text-xs text-muted-foreground">PRD</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-600">2×</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Apotheken</div>
                      <div className="text-xs text-muted-foreground">PHM</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <div className="w-8 h-8 rounded bg-yellow-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-yellow-600">1×</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Marken</div>
                      <div className="text-xs text-muted-foreground">BRD</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-weed-green/5 border border-weed-green/20">
                  <div className="w-8 h-8 rounded bg-weed-green/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-weed-green">1×</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">FLEX Position</div>
                    <div className="text-xs text-muted-foreground">Beliebige Kategorie</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  💡 Die FLEX-Position kann mit einem Spieler aus einer beliebigen Kategorie besetzt werden.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Draft Settings - Season Only */}
          {formData.leagueType === "season" && (
            <Card className="bg-white border-2 border-weed-green shadow-xl">
            <CardHeader>
              <CardTitle className="headline-secondary text-foreground flex items-center gap-2 uppercase">
                <Calendar className="w-5 h-5 text-weed-green" />
                Draft-Einstellungen
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Wann soll der Draft stattfinden?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="draftDate">Draft-Datum (optional)</Label>
                <Input
                  id="draftDate"
                  type="datetime-local"
                  value={formData.draftDate}
                  onChange={(e) => setFormData({ ...formData, draftDate: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Leer lassen, um später festzulegen
                </p>
              </div>
            </CardContent>
          </Card>
          )}

          {/* League Rules - Season Only */}
          {formData.leagueType === "season" && (
            <Card className="bg-white border-2 border-weed-green shadow-xl">
            <CardHeader>
              <CardTitle className="headline-secondary text-foreground flex items-center gap-2 uppercase">
                <UserCircle className="w-5 h-5 text-weed-green" />
                Liga-Regeln
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Konfiguriere die Spielregeln für deine Liga.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scoringSystem">Scoring-System</Label>
                <Select
                  value={formData.scoringSystem}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, scoringSystem: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="ppr">PPR (Points Per Reception)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waiverType">Waiver-System</Label>
                <Select
                  value={formData.waiverType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, waiverType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faab">FAAB (Free Agent Acquisition Budget)</SelectItem>
                    <SelectItem value="rolling">Rolling Waivers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.waiverType === "faab" && (
                <div className="space-y-2">
                  <Label htmlFor="faabBudget">FAAB Budget</Label>
                  <Input
                    id="faabBudget"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.faabBudget}
                    onChange={(e) =>
                      setFormData({ ...formData, faabBudget: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Jedes Team startet mit diesem Budget für Waiver-Gebote
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tradeDeadlineWeek">Trade Deadline (Woche)</Label>
                <Input
                  id="tradeDeadlineWeek"
                  type="number"
                  min="1"
                  max="18"
                  value={formData.tradeDeadlineWeek}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tradeDeadlineWeek: parseInt(e.target.value) || 13,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Nach dieser Woche sind keine Trades mehr möglich
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic">Öffentliche Liga</Label>
                  <p className="text-sm text-muted-foreground">
                    Andere Spieler können dieser Liga beitreten
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublic: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 border-2 border-weed-coral text-weed-coral hover:bg-weed-coral hover:text-white" onClick={() => window.history.back()}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-weed-green text-black hover:bg-weed-green/90 font-bold uppercase"
              disabled={createLeague.isPending || !formData.name.trim()}
            >
              {createLeague.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Erstelle Liga...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-2" />
                  Liga erstellen
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
