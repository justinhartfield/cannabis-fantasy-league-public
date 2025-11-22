import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, TrendingUp, Zap, Leaf, ArrowRight } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useTranslation } from "@/contexts/LanguageContext";
import { Link } from "wouter";

/**
 * Home Page - Weed.de 2026 Reskin
 * 
 * Bold, colorful landing page showcasing the Cannabis Fantasy League
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const { t: tHome } = useTranslation("home");
  const footerCopy = tHome("footer.disclaimer", {
    replacements: { year: new Date().getFullYear(), appTitle: APP_TITLE },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-weed-green border-t-transparent"></div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-weed-cream dark:bg-weed-burgundy">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-weed-coral pattern-dots">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <img
                src={APP_LOGO}
                alt={APP_TITLE}
                className="h-32 w-32 rounded-3xl object-cover shadow-2xl ring-4 ring-white"
              />
            </div>

            {/* Headline */}
            <h1 className="headline-primary text-5xl md:text-7xl text-white leading-tight">
              {APP_TITLE}
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto body-text">
              {tHome("hero.subheading")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                className="text-lg px-8"
                onClick={() => {
                  const loginUrl = getLoginUrl();
                  if (loginUrl) window.location.href = loginUrl;
                  else window.location.href = "/login";
                }}
              >
                {tHome("hero.getStarted")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 bg-white text-weed-coral border-white hover:bg-white/90"
                asChild
              >
                <Link href="/dashboard">
                  {tHome("hero.viewDashboard")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-weed-purple">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="headline-primary text-4xl md:text-5xl text-weed-coral mb-4">
              {tHome("features.title")}
            </h2>
            <p className="text-lg text-muted-foreground dark:text-white/70 max-w-2xl mx-auto">
              {tHome("features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <Card className="bg-weed-green border-0 text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-black flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-weed-green" />
                </div>
                <CardTitle className="text-black">
                  {tHome("features.items.compete.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-black/80 body-text">
                  {tHome("features.items.compete.description")}
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="bg-weed-purple border-0 text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-weed-green flex items-center justify-center">
                  <Users className="h-8 w-8 text-black" />
                </div>
                <CardTitle className="text-white">
                  {tHome("features.items.friends.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 body-text">
                  {tHome("features.items.friends.description")}
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="bg-weed-pink border-0 text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-weed-pink" />
                </div>
                <CardTitle className="text-white">
                  {tHome("features.items.track.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 body-text">
                  {tHome("features.items.track.description")}
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="bg-weed-coral border-0 text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-weed-green flex items-center justify-center">
                  <Zap className="h-8 w-8 text-black" />
                </div>
                <CardTitle className="text-white">
                  {tHome("features.items.daily.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 body-text">
                  {tHome("features.items.daily.description")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-weed-cream dark:bg-weed-burgundy">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="headline-primary text-4xl md:text-5xl text-weed-purple dark:text-weed-green mb-4">
              {tHome("howItWorks.title")}
            </h2>
            <p className="text-lg text-muted-foreground dark:text-white/70 max-w-2xl mx-auto">
              {tHome("howItWorks.subtitle")}
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Step 1 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-weed-green flex items-center justify-center">
                <span className="text-2xl font-bold text-black">1</span>
              </div>
              <div>
                <h3 className="headline-secondary text-2xl text-foreground dark:text-white mb-2">
                  {tHome("howItWorks.steps.create.title")}
                </h3>
                <p className="body-text text-muted-foreground dark:text-white/70">
                  {tHome("howItWorks.steps.create.description")}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-weed-coral flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <div>
                <h3 className="headline-secondary text-2xl text-foreground dark:text-white mb-2">
                  {tHome("howItWorks.steps.draft.title")}
                </h3>
                <p className="body-text text-muted-foreground dark:text-white/70">
                  {tHome("howItWorks.steps.draft.description")}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-weed-purple flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <div>
                <h3 className="headline-secondary text-2xl text-foreground dark:text-white mb-2">
                  {tHome("howItWorks.steps.compete.title")}
                </h3>
                <p className="body-text text-muted-foreground dark:text-white/70">
                  {tHome("howItWorks.steps.compete.description")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-weed-purple pattern-grid">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex justify-center">
              <Leaf className="h-20 w-20 text-weed-green" />
            </div>
            <h2 className="headline-primary text-4xl md:text-6xl text-white">
              {tHome("cta.title")}
            </h2>
            <p className="text-xl text-white/90 body-text">
              {tHome("cta.subtitle")}
            </p>
            <Button
              size="lg"
              className="text-lg px-12"
              onClick={() => {
                const loginUrl = getLoginUrl();
                if (loginUrl) window.location.href = loginUrl;
                else window.location.href = "/login";
              }}
            >
              {tHome("cta.primary")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-weed-burgundy dark:bg-black">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/60 text-sm">
            {footerCopy}
          </p>
        </div>
      </footer>
    </div>
  );
}
