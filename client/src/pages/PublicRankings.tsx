import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Users, Factory, Pill, Store, Leaf, Calendar, Share2, ExternalLink, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityRankingCard } from "@/components/EntityRankingCard";
import { RankBadge } from "@/components/RankBadge";
import { RankingsSEO } from "@/components/SEO";
import { staticContent } from "@/content/static-pages";
import { AppHeader } from "@/components/AppHeader";
import { GlobalFooter } from "@/components/GlobalFooter";

type EntityCategory = "all" | "manufacturer" | "pharmacy" | "brand" | "product" | "strain";

const categoryConfig: Record<Exclude<EntityCategory, "all">, { icon: typeof Factory; label: string; color: string; description: string }> = {
  manufacturer: { icon: Factory, label: "Manufacturers", color: "text-blue-400", description: "Leading cannabis producers" },
  pharmacy: { icon: Store, label: "Pharmacies", color: "text-purple-400", description: "Top-performing dispensaries" },
  brand: { icon: Sparkles, label: "Brands", color: "text-pink-400", description: "Trending cannabis brands" },
  product: { icon: Pill, label: "Products", color: "text-amber-400", description: "Best-selling products" },
  strain: { icon: Leaf, label: "Flower", color: "text-emerald-400", description: "Most popular strains" },
};

export default function PublicRankings() {
  const [, params] = useRoute("/rankings/:category?");
  const category = (params?.category as EntityCategory) || "all";
  const [timeframe, setTimeframe] = useState<"daily" | "weekly">("daily");
  const [selectedDate] = useState(new Date().toISOString().split("T")[0]);

  const dailyQuery = trpc.leaderboard.getDailyEntityLeaderboard.useQuery({ date: selectedDate, limit: 25 }, { enabled: timeframe === "daily" });
  const weeklyQuery = trpc.leaderboard.getWeeklyEntityLeaderboard.useQuery({ limit: 25 }, { enabled: timeframe === "weekly" });
  const hallOfFameQuery = trpc.leaderboard.getHallOfFame.useQuery({ limit: 10 });

  const data = timeframe === "daily" ? dailyQuery.data : weeklyQuery.data;
  const isLoading = timeframe === "daily" ? dailyQuery.isLoading : weeklyQuery.isLoading;

  const handleShare = async () => {
    const shareData = { title: "Cannabis Fantasy League Rankings", text: "Check out the official rankings for the German cannabis market!", url: window.location.href };
    if (navigator.share) { try { await navigator.share(shareData); } catch { } } else { navigator.clipboard.writeText(window.location.href); }
  };

  const renderCategorySection = (categoryKey: Exclude<EntityCategory, "all">, items: any[]) => {
    const config = categoryConfig[categoryKey];
    const Icon = config.icon;
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl bg-card border border-border", config.color)}><Icon className="w-5 h-5" /></div>
            <div><h2 className="text-xl font-bold">{config.label}</h2><p className="text-sm text-muted-foreground">{config.description}</p></div>
          </div>
          {category === "all" && <Link href={`/rankings/${categoryKey}`}><Button variant="ghost" size="sm" className="gap-1">View All <ChevronRight className="w-4 h-4" /></Button></Link>}
        </div>
        <div className="grid gap-3">
          {items.slice(0, category === "all" ? 5 : 25).map((item, index) => (
            <EntityRankingCard key={item.id} id={item.id} name={item.name} type={categoryKey} rank={index + 1} score={item.score} imageUrl={item.logoUrl || item.imageUrl} compact={category === "all"} linkTo={`/entity/${categoryKey}/${item.id}`} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/10 flex flex-col">
      <AppHeader />
      <main className="flex-1 pt-[var(--app-header-height)]">
        <RankingsSEO category={category !== "all" ? category : undefined} />
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
          <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3"><Trophy className="w-8 h-8 text-yellow-500" /><span className="text-xs uppercase tracking-[0.3em] text-emerald-400 font-semibold">Official Rankings</span></div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Cannabis Market<span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Leaderboard</span></h1>
                <p className="text-lg text-muted-foreground max-w-xl">Real-time rankings of manufacturers, pharmacies, brands, and strains in the German medical cannabis market.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleShare} variant="outline" className="gap-2"><Share2 className="w-4 h-4" />Share Rankings</Button>
                <Link href="/sign-up"><Button className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">Join the Game<ExternalLink className="w-4 h-4" /></Button></Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-20">
          <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-4 border-b border-border/50 -mx-4 px-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <Tabs value={category} className="w-full md:w-auto">
                <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full md:w-auto">
                  <Link href="/rankings"><TabsTrigger value="all" className="gap-1"><Trophy className="w-4 h-4" /><span className="hidden md:inline">All</span></TabsTrigger></Link>
                  {(Object.keys(categoryConfig) as Exclude<EntityCategory, "all">[]).map((key) => { const config = categoryConfig[key]; const Icon = config.icon; return (<Link key={key} href={`/rankings/${key}`}><TabsTrigger value={key} className="gap-1"><Icon className={cn("w-4 h-4", config.color)} /><span className="hidden md:inline">{config.label}</span></TabsTrigger></Link>); })}
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2 bg-card rounded-lg p-1 border border-border">
                <Button variant={timeframe === "daily" ? "default" : "ghost"} size="sm" onClick={() => setTimeframe("daily")} className="gap-1"><Calendar className="w-4 h-4" />Daily</Button>
                <Button variant={timeframe === "weekly" ? "default" : "ghost"} size="sm" onClick={() => setTimeframe("weekly")} className="gap-1"><TrendingUp className="w-4 h-4" />Weekly</Button>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /><p className="text-muted-foreground">Loading rankings...</p></div>
          ) : (
            <div className="space-y-12">
              {category === "all" ? (
                <>{data?.manufacturers && data.manufacturers.length > 0 && renderCategorySection("manufacturer", data.manufacturers)}{data?.pharmacies && data.pharmacies.length > 0 && renderCategorySection("pharmacy", data.pharmacies)}{data?.brands && data.brands.length > 0 && renderCategorySection("brand", data.brands)}{data?.products && data.products.length > 0 && renderCategorySection("product", data.products)}{data?.strains && data.strains.length > 0 && renderCategorySection("strain", data.strains)}</>
              ) : (
                <>{category === "manufacturer" && data?.manufacturers && renderCategorySection("manufacturer", data.manufacturers)}{category === "pharmacy" && data?.pharmacies && renderCategorySection("pharmacy", data.pharmacies)}{category === "brand" && data?.brands && renderCategorySection("brand", data.brands)}{category === "product" && data?.products && renderCategorySection("product", data.products)}{category === "strain" && data?.strains && renderCategorySection("strain", data.strains)}</>
              )}
              {category === "all" && (
                <section className="space-y-4 pt-8 border-t border-border/50">
                  <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30"><Users className="w-5 h-5 text-yellow-500" /></div><div><h2 className="text-xl font-bold">Top Fantasy Players</h2><p className="text-sm text-muted-foreground">Season legends and high scorers</p></div></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {hallOfFameQuery.data?.seasonLeaders?.slice(0, 5).map((player, index) => (
                      <Card key={player.teamId} className="bg-card/50 border-border/50"><CardContent className="flex items-center gap-4 p-4"><RankBadge rank={index + 1} size="md" /><Avatar className="w-12 h-12 border border-border"><AvatarImage src={player.avatarUrl || undefined} /><AvatarFallback>{player.userName?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><p className="font-bold truncate">{player.teamName}</p><p className="text-sm text-muted-foreground truncate">{player.userName} • {player.leagueName}</p></div><div className="text-right"><p className="text-lg font-bold text-primary">{player.totalScore?.toLocaleString()}</p><p className="text-xs text-muted-foreground">pts</p></div></CardContent></Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
          <section className="mt-16 p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-purple-500/10 border border-emerald-500/20">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Play the Metagame?</h2>
              <p className="text-muted-foreground mb-6">Draft your team of manufacturers, strains, and pharmacies. Compete against other players based on real market performance data.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/sign-up"><Button size="lg" className="w-full sm:w-auto gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500">Create Free Account</Button></Link>
                <Link href="/rules"><Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">Learn How to Play</Button></Link>
              </div>
            </div>
          </section>

          {/* SEO Content */}
          <section className="mt-16 prose prose-invert max-w-none text-muted-foreground">
            <div
              dangerouslySetInnerHTML={{
                __html: category === 'all'
                  ? staticContent.rankings.general.content
                  : staticContent.rankings[category as keyof typeof staticContent.rankings]?.content || staticContent.rankings.general.content
              }}
            />
          </section>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}

