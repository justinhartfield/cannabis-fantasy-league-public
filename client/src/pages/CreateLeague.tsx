import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import {
  Trophy,
  ArrowLeft,
  Loader2,
  Calendar,
  UserCircle,
  Settings,
  Clock,
  Zap,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function CreateLeague() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const createLeague = trpc.league.create.useMutation();

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
    seasonLength: 18,
    isPublic: false,
    leagueType: "season" as "season" | "challenge",
    // Challenge timing fields
    durationHours: 24,
    challengeStartTime: "", // ISO datetime
  });

  // Duration presets for quick selection
  const durationPresets = [
    { value: 4, label: "4h Sprint", icon: "⚡" },
    { value: 8, label: "8h Quickplay", icon: "🏃" },
    { value: 12, label: "12h Half-Day", icon: "🌗" },
    { value: 24, label: "24h Classic", icon: "🌿", recommended: true },
    { value: 48, label: "48h Weekend", icon: "📅" },
    { value: 72, label: "72h Marathon", icon: "🏆" },
    { value: 168, label: "Weekly", icon: "📆" },
  ];

  // Calculate halftime and end time for display
  const getHalftimeInfo = () => {
    if (formData.durationHours === 24) {
      return "4:20 PM (themed halftime!)";
    }
    return `${formData.durationHours / 2}h after start`;
  };

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
      toast.error("Please enter a league name");
      return;
    }

    try {
      const result = await createLeague.mutateAsync(formData);
      toast.success("League created successfully!");
      setLocation(`/league/${result.leagueId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create league");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <Trophy className="w-12 h-12 text-yellow-500" />
              <div>
                  <h1 className="text-xl font-bold text-foreground headline-primary">
                    Create New League
                  </h1>
                <p className="text-sm text-muted-foreground">
                  {formData.leagueType === "season" ? "Saison-Modus" : "Daily Challenge"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set the basic information for your league.
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
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
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
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
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
                <Label htmlFor="name">Liga-Name *</Label>
                <Input
                  id="name"
                  placeholder="z.B. Cannabis Champions 2025"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">Öffentliche Liga</Label>
                  <p className="text-sm text-muted-foreground">
                    Andere Spieler können dieser Liga beitreten und sie in der Liga-Suche finden.
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

              {formData.leagueType === "season" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seasonLength">Saison-Länge</Label>
                    <Select
                      value={formData.seasonLength.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, seasonLength: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">Sprint (4 Wochen)</SelectItem>
                        <SelectItem value="8">Viertel (8 Wochen)</SelectItem>
                        <SelectItem value="12">Halbzeit (12 Wochen)</SelectItem>
                        <SelectItem value="18">Volle Saison (18 Wochen)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Playoffs starten in Woche {formData.seasonLength + 1}
                    </p>
                  </div>

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
                        {[2, 4, 6, 8, 10, 12, 14, 16].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Teams
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Maximale Anzahl an Teams, die der Liga beitreten können
                    </p>
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
                        {[2, 4, 6, 8].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Teams
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Anzahl der Teams, die sich für die Playoffs qualifizieren
                    </p>
                  </div>
                </div>
              )}

              {formData.leagueType === "challenge" && (
                <div className="space-y-4">
                  {/* Challenge Info */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Daily Challenge:</strong> 2 Spieler, 10-Asset Squads.
                      Keine Draft-Phase - direkte Lineup-Auswahl.
                    </p>
                  </div>

                  {/* Duration Selection */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      Challenge-Dauer
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {durationPresets.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, durationHours: preset.value })}
                          className={`p-2 rounded-lg border-2 transition-all text-center ${
                            formData.durationHours === preset.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          } ${preset.recommended ? "ring-2 ring-green-500/30" : ""}`}
                        >
                          <div className="text-lg">{preset.icon}</div>
                          <div className="text-xs font-medium">{preset.label}</div>
                          {preset.recommended && (
                            <div className="text-[10px] text-green-600 dark:text-green-400">4:20 Halftime!</div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom duration slider */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Custom Duration</span>
                        <span className="font-medium">{formData.durationHours}h</span>
                      </div>
                      <Slider
                        value={[formData.durationHours]}
                        onValueChange={([value]) => setFormData({ ...formData, durationHours: value })}
                        min={4}
                        max={168}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>4h</span>
                        <span>168h (1 week)</span>
                      </div>
                    </div>
                  </div>

                  {/* Start Time Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="challengeStartTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Start-Zeit (optional)
                    </Label>
                    <Input
                      id="challengeStartTime"
                      type="datetime-local"
                      value={formData.challengeStartTime}
                      onChange={(e) => setFormData({ ...formData, challengeStartTime: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leer lassen für sofortigen Start
                    </p>
                  </div>

                  {/* Game Mechanics Info */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-yellow-500/10 border border-green-500/20 space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Game Mechanics
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">⏱️</span>
                        <div>
                          <div className="font-medium">Halftime</div>
                          <div className="text-xs text-muted-foreground">{getHalftimeInfo()}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">🔄</span>
                        <div>
                          <div className="font-medium">Substitutions</div>
                          <div className="text-xs text-muted-foreground">2 swaps at halftime</div>
                        </div>
                      </div>
                      {formData.durationHours === 24 && (
                        <div className="flex items-start gap-2">
                          <span className="text-lg">🔥</span>
                          <div>
                            <div className="font-medium">Power Hour</div>
                            <div className="text-xs text-muted-foreground">2x points 4:15-4:25 PM</div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-lg">⚡</span>
                        <div>
                          <div className="font-medium">Golden Goal OT</div>
                          <div className="text-xs text-muted-foreground">If within 50 pts</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Roster Structure Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
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
                <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">1×</span>
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
            <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5" />
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


          {/* Submit Button */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" asChild>
              <Link href="/">Abbrechen</Link>
            </Button>
            <Button
              type="submit"
              className="flex-1"
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
