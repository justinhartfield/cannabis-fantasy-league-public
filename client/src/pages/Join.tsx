import { useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gift, Users, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";

function getReferralCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  return ref ? ref.toUpperCase() : null;
}

export default function Join() {
  const { isAuthenticated, loading } = useAuth();

  const referralCode = useMemo(() => getReferralCodeFromLocation(), []);

  useEffect(() => {
    if (referralCode && typeof window !== "undefined") {
      try {
        localStorage.setItem("cfl_referral_code", referralCode);
      } catch {
        // ignore storage errors
      }
    }
  }, [referralCode]);

  const handleGetStarted = () => {
    const loginUrl = getLoginUrl();
    if (loginUrl) window.location.href = loginUrl;
    else window.location.href = "/sign-up";
  };

  return (
    <div className="min-h-screen bg-weed-cream dark:bg-weed-burgundy flex items-center justify-center px-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src={APP_LOGO}
              alt={APP_TITLE}
              className="h-24 w-24 rounded-2xl object-cover shadow-xl ring-4 ring-weed-green"
            />
          </div>
          <h1 className="headline-primary text-4xl md:text-5xl text-weed-burgundy dark:text-weed-green">
            You&apos;ve been invited!
          </h1>
          <p className="text-lg text-muted-foreground dark:text-white/80 max-w-xl mx-auto">
            Join the Cannabis Fantasy League, build your team, and help your friend earn a streak
            freeze reward when you join your first league.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1.5fr]">
          <Card className="bg-white/90 dark:bg-weed-purple/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-weed-green" />
                Claim your invite
              </CardTitle>
              <CardDescription>
                Create an account or log in to accept this referral and start playing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referralCode && (
                <div className="p-3 rounded-lg bg-weed-green/10 border border-weed-green/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-weed-green" />
                    <span className="text-sm text-muted-foreground">
                      Referral code saved for this session
                    </span>
                  </div>
                  <span className="text-sm font-mono font-semibold">{referralCode}</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                As soon as you join your first league, your friend will automatically receive a
                streak freeze token they can use to protect their prediction streak.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1" onClick={handleGetStarted}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/login">
                    <span className="flex items-center justify-center">
                      <LogIn className="w-4 h-4 mr-2" />
                      I already have an account
                    </span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-black/40">
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
              <CardDescription>Invites are simple and fair for everyone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-1">
                <li>Sign up or log in to your Cannabis Fantasy League account.</li>
                <li>Create or join your first league and draft your team.</li>
                <li>Your friend earns a streak freeze token for your first league join.</li>
              </ol>
              {isAuthenticated && !loading && (
                <p className="pt-2 text-xs text-foreground">
                  You&apos;re already signed in. Head to your{" "}
                  <Link href="/leagues">
                    <span className="underline cursor-pointer">leagues</span>
                  </Link>{" "}
                  to create or join a league and trigger the referral reward.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


