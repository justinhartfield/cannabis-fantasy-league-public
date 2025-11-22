import { useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Gift,
  Link2,
  Users,
  Zap,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useTranslation } from "@/contexts/LanguageContext";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export default function InviteFriends() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t: tInvite } = useTranslation("invite");
  const { t: tNav } = useTranslation("nav");
  const { copy } = useCopyToClipboard({
    successKey: "invite.copySuccess",
    errorKey: "invite.copyError",
  });

  const {
    data: referral,
    isLoading: referralLoading,
    refetch: refetchReferral,
  } = trpc.profile.getReferralInfo.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const loginUrl = getLoginUrl();
      if (loginUrl) window.location.href = loginUrl;
      else setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const inviteUrl = useMemo(() => {
    if (!referral?.invitePath && !referral?.referralCode) return "";
    const path = referral?.invitePath || `/join?ref=${referral?.referralCode}`;
    if (typeof window === "undefined") {
      return path;
    }
    return `${window.location.origin}${path}`;
  }, [referral]);

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    await copy(inviteUrl);
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    const shareTitle = tInvite("shareTitle");
    const shareMessage = tInvite("shareMessage");

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: inviteUrl,
        });
      } catch {
        // user cancelled share, no-op
      }
    } else {
      await handleCopyLink();
    }
  };

  if (authLoading || referralLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tInvite("backButton") || tNav("dashboard")}
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Invite Friends</h1>
            <p className="text-muted-foreground">
              {tInvite("description")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {tInvite("highlight")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1.5fr]">
          {/* Invite Link & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{tInvite("cardTitle")}</CardTitle>
              <CardDescription>{tInvite("cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  {tInvite("inviteLinkLabel")}
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteUrl}
                    className="font-mono text-xs md:text-sm"
                  />
                  <Button variant="outline" onClick={handleCopyLink}>
                    {tInvite("copyButton")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {tInvite("referralCodeLabel")}
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold tracking-wide">
                    {referral?.referralCode}
                  </span>
                  <Button variant="outline" size="sm" onClick={refetchReferral}>
                    {tInvite("refreshButton")}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  {tInvite("shareCta")}
                </Button>
                <Button variant="outline" onClick={handleCopyLink}>
                  <Link2 className="w-4 h-4 mr-2" />
                  {tInvite("shareLink")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rewards & Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{tInvite("rewardsTitle")}</CardTitle>
                <CardDescription>{tInvite("rewardsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>{tInvite("stats.streakTokens")}</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {referral?.streakFreezeTokens ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gift className="w-4 h-4 text-green-500" />
                    <span>{tInvite("stats.completed")}</span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {referral?.completedReferrals ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>{tInvite("stats.total")}</span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {referral?.totalReferrals ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tInvite("howItWorksTitle")}</CardTitle>
                <CardDescription>{tInvite("howItWorksDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ol className="list-decimal list-inside space-y-2">
                  <li>{tInvite("steps.share")}</li>
                  <li>{tInvite("steps.join")}</li>
                  <li>{tInvite("steps.reward")}</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


