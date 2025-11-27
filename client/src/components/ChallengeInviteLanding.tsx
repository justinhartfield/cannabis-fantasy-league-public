import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  Trophy, 
  TrendingUp, 
  Flame, 
  Target, 
  Zap, 
  ArrowRight, 
  Loader2,
  Swords,
  Crown,
  Users
} from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { FIGHTER_ILLUSTRATIONS, getFighterByFile } from "@/components/FighterPicker";
import { toast } from "sonner";

interface ChallengeInviteLandingProps {
  challengeId: number;
  isAuthenticated?: boolean;
  leagueCode?: string;
}

// Default fighter for "VS YOU?" placeholder
const PLACEHOLDER_FIGHTER = FIGHTER_ILLUSTRATIONS[2]; // Family Flower

export function ChallengeInviteLanding({ challengeId, isAuthenticated = false, leagueCode }: ChallengeInviteLandingProps) {
  const [, setLocation] = useLocation();
  const [teamName, setTeamName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Fetch public challenge info
  const { data: challenge, isLoading: challengeLoading } = trpc.league.getPublicChallengeInfo.useQuery(
    { challengeId },
    { retry: false }
  );

  // Fetch leaderboard preview
  const { data: leaderboard } = trpc.leaderboard.getDailyEntityLeaderboard.useQuery(
    { limit: 3 },
    { retry: false }
  );

  // Join challenge mutation (for authenticated users)
  const joinByCodeMutation = trpc.league.joinByCode.useMutation({
    onSuccess: (data) => {
      toast.success("You've joined the challenge!");
      // Redirect to the challenge page (which will now show the normal view since user is a member)
      setLocation(`/challenge/${data.leagueId}`);
      // Force a refresh to ensure the page shows the updated state
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to join challenge");
      setIsJoining(false);
    },
  });

  const handleSignUpAndDraft = () => {
    // Store the challenge ID for redirect after auth
    if (typeof window !== "undefined") {
      localStorage.setItem("cfl_pending_challenge", challengeId.toString());
    }
    
    const loginUrl = getLoginUrl();
    if (loginUrl) {
      window.location.href = loginUrl;
    } else {
      window.location.href = "/login";
    }
  };

  const handleAcceptChallenge = () => {
    if (!leagueCode) {
      toast.error("Missing challenge code");
      return;
    }
    
    setIsJoining(true);
    joinByCodeMutation.mutate({
      leagueCode,
      teamName: teamName.trim() || undefined,
    });
  };

  if (challengeLoading) {
    return (
      <div className="min-h-screen bg-weed-burgundy flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-weed-green" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-weed-burgundy flex items-center justify-center p-4">
        <Card className="max-w-md bg-white/10 border-white/20">
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Challenge Not Found</h2>
            <p className="text-white/60 mb-6">
              This challenge doesn't exist or has expired.
            </p>
            <Button onClick={() => window.location.href = "/"} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the challenger (creator) team info
  const creatorTeam = challenge.teams[0];
  const creatorFighter = creatorTeam?.fighterIllustration 
    ? getFighterByFile(creatorTeam.fighterIllustration) 
    : FIGHTER_ILLUSTRATIONS[0];

  // Get top performers for leaderboard preview
  const topManufacturers = leaderboard?.manufacturers?.slice(0, 3) || [];
  const topStrains = leaderboard?.strains?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-weed-burgundy">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-weed-coral pattern-dots">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Stylized Title */}
            <div className="flex justify-center">
              <div className="relative">
                <h2 className="headline-primary text-2xl md:text-3xl tracking-tight">
                  <span className="text-weed-green drop-shadow-[0_0_20px_rgba(207,255,77,0.5)]">Cannabis</span>
                  <span className="text-white mx-2">Fantasy</span>
                  <span className="text-black/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">League</span>
                </h2>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-weed-green via-white to-black/60 rounded-full opacity-60" />
              </div>
            </div>

            {/* Challenge Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm">
              <Swords className="w-4 h-4 text-weed-green" />
              <span className="text-white/90 text-sm font-medium">Daily Challenge</span>
            </div>

            {/* Headline */}
            <h1 className="headline-primary text-4xl md:text-6xl text-white leading-tight">
              You've Been Challenged!
            </h1>

            {/* Challenge Info */}
            <div className="space-y-2">
              <p className="text-xl md:text-2xl text-white/90">
                <span className="font-bold text-weed-green">{creatorTeam?.userName || 'A friend'}</span> wants to battle
              </p>
              <p className="text-lg text-white/70">
                {challenge.name}
              </p>
            </div>

            {/* Top CTA Button */}
            <div className="pt-4">
              <Button
                size="lg"
                onClick={handleSignUpAndDraft}
                className="text-lg px-10 py-5 h-auto bg-weed-green hover:bg-weed-green/90 text-black font-bold rounded-2xl shadow-[0_0_40px_rgba(207,255,77,0.3)] hover:shadow-[0_0_60px_rgba(207,255,77,0.5)] transition-all"
              >
                Sign Up & Start Draft
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Battle Arena Preview */}
      <section className="py-12 -mt-8 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#1a0a1f] via-[#0f0f16] to-[#050505] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-8">
              {/* VS Banner */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-weed-coral to-weed-pink flex items-center justify-center shadow-xl animate-pulse">
                  <span className="text-white font-bold text-xl">VS</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-8">
                {/* Challenger (Creator) */}
                <div className="flex-1 text-center space-y-4">
                  <div className="relative w-32 h-32 mx-auto">
                    <img
                      src={`/assets/illustrations/${creatorFighter?.file || FIGHTER_ILLUSTRATIONS[0].file}`}
                      alt={creatorFighter?.name || "Fighter"}
                      className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(207,255,77,0.3)]"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{creatorTeam?.name || "Challenger"}</p>
                    <p className="text-sm text-white/60">{creatorTeam?.userName}</p>
                  </div>
                </div>

                {/* You (Placeholder) */}
                <div className="flex-1 text-center space-y-4">
                  <div className="relative w-32 h-32 mx-auto opacity-50">
                    <img
                      src={`/assets/illustrations/${PLACEHOLDER_FIGHTER.file}`}
                      alt="Your Fighter"
                      className="w-full h-full object-contain grayscale"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white bg-black/50 px-3 py-1 rounded-lg">?</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-weed-green">YOU?</p>
                    <p className="text-sm text-white/60">Accept the challenge</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is CFL Section */}
      <section className="py-16 bg-weed-purple/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div>
              <h2 className="headline-primary text-3xl md:text-4xl text-weed-green mb-4">
                What is Cannabis Fantasy League?
              </h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto">
                Germany's first fantasy league for medical cannabis. Draft real brands, strains, 
                and pharmacies—then compete based on actual market performance!
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-weed-green/20 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-7 h-7 text-weed-green" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Draft Your Team</h3>
                  <p className="text-sm text-white/60">
                    Pick from real cannabis brands, strains, and products
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-weed-coral/20 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-7 h-7 text-weed-coral" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Real Data</h3>
                  <p className="text-sm text-white/60">
                    Scores based on actual market trends from weed.de
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-weed-pink/20 flex items-center justify-center mx-auto mb-4">
                    <Swords className="w-7 h-7 text-weed-pink" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Head-to-Head</h3>
                  <p className="text-sm text-white/60">
                    Battle friends in 24-hour daily challenges
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How Scoring Works */}
      <section className="py-16 bg-weed-burgundy">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="headline-primary text-3xl md:text-4xl text-weed-coral mb-4">
                How Scoring Works
              </h2>
              <p className="text-white/70">
                Draft smart. Ride the trends. Win big.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Trend Momentum */}
              <Card className="bg-gradient-to-br from-weed-green/20 to-transparent border-weed-green/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-weed-green flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Trend</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2">
                    Draft rising entities
                  </p>
                  <p className="text-xs text-weed-green font-mono">
                    Up to 5x multiplier
                  </p>
                </CardContent>
              </Card>

              {/* Rank Bonus */}
              <Card className="bg-gradient-to-br from-weed-coral/20 to-transparent border-weed-coral/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-weed-coral flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Rank</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2">
                    Top 10 earn bonuses
                  </p>
                  <p className="text-xs text-weed-coral font-mono">
                    #1 = +30 pts
                  </p>
                </CardContent>
              </Card>

              {/* Streak Bonus */}
              <Card className="bg-gradient-to-br from-orange-500/20 to-transparent border-orange-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Streak</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2">
                    Hot streak multipliers
                  </p>
                  <p className="text-xs text-orange-400 font-mono">
                    🔥 to 🔥🔥🔥🔥🔥
                  </p>
                </CardContent>
              </Card>

              {/* Momentum */}
              <Card className="bg-gradient-to-br from-weed-pink/20 to-transparent border-weed-pink/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-weed-pink flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Momentum</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2">
                    Climbing ranks = pts
                  </p>
                  <p className="text-xs text-weed-pink font-mono">
                    +8 per rank gained
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      {(topManufacturers.length > 0 || topStrains.length > 0) && (
        <section className="py-16 bg-weed-purple/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="headline-primary text-3xl md:text-4xl text-white mb-4">
                  Today's Top Performers
                </h2>
                <p className="text-white/60">
                  See what's trending—then draft your winners
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Manufacturers */}
                {topManufacturers.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="w-5 h-5 text-weed-green" />
                        <span className="text-white">Top Manufacturers</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {topManufacturers.map((manufacturer: any, index: number) => (
                        <div 
                          key={manufacturer.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                              ${index === 0 ? 'bg-yellow-500 text-black' : 
                                index === 1 ? 'bg-gray-400 text-black' : 
                                'bg-orange-600 text-white'}
                            `}>
                              {index + 1}
                            </span>
                            <span className="text-white font-medium">{manufacturer.name}</span>
                          </div>
                          <span className="text-weed-green font-mono text-sm">
                            {manufacturer.score?.toLocaleString() || 0} pts
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Top Strains */}
                {topStrains.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-weed-coral" />
                        <span className="text-white">Top Strains</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {topStrains.map((strain: any, index: number) => (
                        <div 
                          key={strain.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                              ${index === 0 ? 'bg-yellow-500 text-black' : 
                                index === 1 ? 'bg-gray-400 text-black' : 
                                'bg-orange-600 text-white'}
                            `}>
                              {index + 1}
                            </span>
                            <span className="text-white font-medium">{strain.name}</span>
                          </div>
                          <span className="text-weed-coral font-mono text-sm">
                            {strain.score?.toLocaleString() || 0} pts
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-weed-burgundy to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="headline-primary text-4xl md:text-5xl text-weed-green">
                Ready to Battle?
              </h2>
              <p className="text-xl text-white/80">
                {isAuthenticated 
                  ? "Enter your team name and accept the challenge!"
                  : "Sign up in seconds and start drafting your winning team!"}
              </p>
            </div>

            {isAuthenticated ? (
              // Authenticated user - show team name input and accept button
              <div className="space-y-6 max-w-md mx-auto">
                <div className="space-y-2 text-left">
                  <Label htmlFor="teamName" className="text-white/80">
                    Your Team Name (optional)
                  </Label>
                  <Input
                    id="teamName"
                    placeholder="Enter your team name..."
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                    maxLength={50}
                  />
                </div>
                <Button
                  size="lg"
                  onClick={handleAcceptChallenge}
                  disabled={isJoining}
                  className="w-full text-xl px-12 py-6 h-auto bg-weed-green hover:bg-weed-green/90 text-black font-bold rounded-2xl shadow-[0_0_40px_rgba(207,255,77,0.3)] hover:shadow-[0_0_60px_rgba(207,255,77,0.5)] transition-all"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Accept Challenge
                      <Swords className="ml-2 h-6 w-6" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Unauthenticated user - show sign up button
              <>
                <Button
                  size="lg"
                  onClick={handleSignUpAndDraft}
                  className="text-xl px-12 py-6 h-auto bg-weed-green hover:bg-weed-green/90 text-black font-bold rounded-2xl shadow-[0_0_40px_rgba(207,255,77,0.3)] hover:shadow-[0_0_60px_rgba(207,255,77,0.5)] transition-all"
                >
                  Sign Up & Start Draft
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>

                <p className="text-sm text-white/50">
                  Free to play • No credit card required
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} {APP_TITLE}. Germany's first fantasy league for medical cannabis 🇩🇪
          </p>
        </div>
      </footer>
    </div>
  );
}

