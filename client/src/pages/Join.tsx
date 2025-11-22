import { useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Gift, Users, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useTranslation } from "@/contexts/LanguageContext";

function getReferralCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  return ref ? ref.toUpperCase() : null;
}

export default function Join() {
  const { isAuthenticated, loading } = useAuth();
  const { t: tJoin } = useTranslation("join");

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
            {tJoin("heroTitle")}
          </h1>
          <p className="text-lg text-muted-foreground dark:text-white/80 max-w-xl mx-auto">
            {tJoin("heroSubtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1.5fr]">
          <Card className="bg-white/90 dark:bg-weed-purple/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-weed-green" />
                {tJoin("claimTitle")}
              </CardTitle>
              <CardDescription>
                {tJoin("claimDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referralCode && (
                <div className="p-3 rounded-lg bg-weed-green/10 border border-weed-green/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-weed-green" />
                    <span className="text-sm text-muted-foreground">
                      {tJoin("referralSaved")}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-semibold">{referralCode}</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {tJoin("rewardDescription")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1" onClick={handleGetStarted}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {tJoin("primaryCta")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/login">
                    <span className="flex items-center justify-center">
                      <LogIn className="w-4 h-4 mr-2" />
                      {tJoin("secondaryCta")}
                    </span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-black/40">
            <CardHeader>
              <CardTitle>{tJoin("nextTitle")}</CardTitle>
              <CardDescription>{tJoin("nextDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-1">
                <li>{tJoin("steps.signup")}</li>
                <li>{tJoin("steps.draft")}</li>
                <li>{tJoin("steps.reward")}</li>
              </ol>
              {isAuthenticated && !loading && (
                <p className="pt-2 text-xs text-foreground">
                  {tJoin("signedInPrefix")}{" "}
                  <Link href="/leagues">
                    <span className="underline cursor-pointer">
                      {tJoin("leaguesLink")}
                    </span>
                  </Link>{" "}
                  {tJoin("signedInSuffix")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


