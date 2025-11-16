import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, TrendingUp, Zap, Leaf, ArrowRight } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";

/**
 * Home Page - Weed.de 2026 Reskin
 * 
 * Bold, colorful landing page showcasing the Cannabis Fantasy League
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();

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
              Germany's first fantasy league for medical cannabis. Build your dream portfolio, compete with friends, and dominate the leaderboard! 🇩🇪
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
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 bg-white text-weed-coral border-white hover:bg-white/90"
                asChild
              >
                <Link href="/dashboard">
                  View Dashboard
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
              Why Play?
            </h2>
            <p className="text-lg text-muted-foreground dark:text-white/70 max-w-2xl mx-auto">
              Experience the future of cannabis education through gamification
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
                  Compete & Win
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-black/80 body-text">
                  Build your fantasy team and compete in season-long leagues or daily challenges
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
                  Play with Friends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 body-text">
                  Create private leagues and invite your crew for friendly competition
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
                  Track Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 body-text">
                  Real-time stats, live scoring, and detailed analytics for your portfolio
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
                  Daily Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 body-text">
                  24-hour head-to-head battles with instant results and rewards
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
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground dark:text-white/70 max-w-2xl mx-auto">
              Get started in three simple steps
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
                  Create Your League
                </h3>
                <p className="body-text text-muted-foreground dark:text-white/70">
                  Choose between season-long leagues or daily challenges. Set your rules, invite friends, and get ready to draft.
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
                  Draft Your Team
                </h3>
                <p className="body-text text-muted-foreground dark:text-white/70">
                  Select manufacturers, strains, and products to build your winning portfolio. Strategy is everything!
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
                  Compete & Win
                </h3>
                <p className="body-text text-muted-foreground dark:text-white/70">
                  Track your team's performance, make strategic moves, and climb the leaderboard to claim victory!
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
              Ready to Play?
            </h2>
            <p className="text-xl text-white/90 body-text">
              Join Germany's most innovative cannabis fantasy league today!
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
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-weed-burgundy dark:bg-black">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/60 text-sm">
            © 2026 {APP_TITLE}. First fantasy league for medical cannabis in Germany 🇩🇪
          </p>
        </div>
      </footer>
    </div>
  );
}
