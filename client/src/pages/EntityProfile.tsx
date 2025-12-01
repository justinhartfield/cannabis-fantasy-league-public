import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RankBadge } from "@/components/RankBadge";
import { EntitySEO } from "@/components/SEO";
import { Trophy, TrendingUp, TrendingDown, BarChart3, Calendar, ArrowLeft, Share2, ExternalLink, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { GlobalFooter } from "@/components/GlobalFooter";

type EntityType = "manufacturer" | "pharmacy" | "brand" | "product" | "strain";
const entityTypeLabels: Record<EntityType, string> = { manufacturer: "Manufacturer", pharmacy: "Pharmacy", brand: "Brand", product: "Product", strain: "Strain" };

export default function EntityProfile() {
  const [, params] = useRoute("/entity/:type/:id");
  const entityType = params?.type as EntityType;
  const entityId = parseInt(params?.id || "0", 10);

  const dailyQuery = trpc.leaderboard.getDailyEntityLeaderboard.useQuery({ limit: 100 });
  const historyQuery = trpc.leaderboard.getEntityHistory.useQuery({ entityType, entityId, days: 30 }, { enabled: !!entityType && !!entityId });

  const findEntity = () => {
    if (!dailyQuery.data) return null;
    const dataMap: Record<EntityType, any[]> = { manufacturer: dailyQuery.data.manufacturers || [], pharmacy: dailyQuery.data.pharmacies || [], brand: dailyQuery.data.brands || [], product: dailyQuery.data.products || [], strain: dailyQuery.data.strains || [] };
    const items = dataMap[entityType] || [];
    const index = items.findIndex((item) => item.id === entityId);

    if (index !== -1) {
      return {
        ...items[index],
        rank: index + 1,
        description: items[index].description // Ensure description is passed through
      };
    }

    // Fallback to history query details if not in top 100
    if (historyQuery.data?.entityDetails) {
      const details = historyQuery.data.entityDetails;
      return {
        id: details.id,
        name: details.name,
        logoUrl: details.logoUrl || details.imageUrl, // Handle different field names
        imageUrl: details.imageUrl || details.logoUrl,
        description: details.description,
        score: 0, // Default if not in leaderboard
        rank: 0, // Default if not in leaderboard
      };
    }

    return null;
  };

  const entity = findEntity();
  const history = historyQuery.data?.history || [];
  const dayOfWeekAverages = historyQuery.data?.dayOfWeekAverages || [];

  const currentScore = history.length > 0 ? history[history.length - 1]?.score || 0 : entity?.score || 0;
  const avgScore = history.length > 0 ? Math.round(history.reduce((sum, item) => sum + (item.score || 0), 0) / history.length) : 0;
  const bestRank = history.reduce((min, item) => (item.rank && item.rank > 0 && item.rank < min ? item.rank : min), 9999);
  const scoreTrend = history.length >= 2 ? history[history.length - 1]?.score - history[history.length - 2]?.score : 0;

  const handleShare = async () => {
    const shareData = { title: `${entity?.name || "Entity"} - CFL Rankings`, text: `Check out ${entity?.name}'s performance in the Cannabis Fantasy League!`, url: window.location.href };
    if (navigator.share) { try { await navigator.share(shareData); } catch { } } else { navigator.clipboard.writeText(window.location.href); }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (<div className="bg-background border border-border p-3 rounded-lg shadow-lg"><p className="font-semibold mb-1">{label}</p>{payload.map((entry: any, index: number) => (<p key={index} style={{ color: entry.color }} className="text-sm">{entry.name}: {entry.value?.toLocaleString()}</p>))}</div>);
    }
    return null;
  };

  if (dailyQuery.isLoading || historyQuery.isLoading) {
    return (<div className="min-h-screen flex flex-col items-center justify-center gap-4"><div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /><p className="text-muted-foreground">Loading entity profile...</p></div>);
  }

  if (!entity) {
    return (<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4"><Trophy className="w-16 h-16 text-muted-foreground/50" /><h1 className="text-2xl font-bold">Entity Not Found</h1><p className="text-muted-foreground text-center max-w-md">This entity may not be ranked yet or the ID is invalid.</p><Link href="/rankings"><Button className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Rankings</Button></Link></div>);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/10 flex flex-col">
      <AppHeader />
      <main className="flex-1 pt-[var(--app-header-height)]">
        <EntitySEO name={entity.name} type={entityType} rank={entity.rank} score={entity.score} imageUrl={entity.logoUrl || entity.imageUrl} />
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto px-4 py-8">
            <Link href={`/rankings/${entityType}`}><Button variant="ghost" size="sm" className="gap-2 mb-6"><ArrowLeft className="w-4 h-4" />Back to {entityTypeLabels[entityType]}s</Button></Link>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-border shadow-2xl"><AvatarImage src={entity.logoUrl || entity.imageUrl} /><AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-muted to-background">{entity.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="absolute -bottom-2 -right-2"><RankBadge rank={entity.rank} size="md" /></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><span className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-semibold">{entityTypeLabels[entityType]}</span>{scoreTrend > 0 && <span className="flex items-center gap-1 text-xs text-emerald-400"><TrendingUp className="w-3 h-3" />Trending</span>}</div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{entity.name}</h1>
                <p className="text-muted-foreground">Currently ranked #{entity.rank} in {entityTypeLabels[entityType].toLowerCase()}s</p>
              </div>
              <div className="flex gap-2"><Button onClick={handleShare} variant="outline" size="sm" className="gap-2"><Share2 className="w-4 h-4" />Share</Button></div>
            </div>

            {entity.description && (
              <div className="mt-8 prose prose-invert max-w-none text-muted-foreground/90">
                <div dangerouslySetInnerHTML={{ __html: entity.description }} />
              </div>
            )}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-4 mb-8">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50"><CardContent className="p-4 text-center"><Sparkles className="w-5 h-5 text-primary mx-auto mb-2" /><p className="text-2xl font-bold text-primary">{currentScore.toLocaleString()}</p><p className="text-xs text-muted-foreground">Current Score</p></CardContent></Card>
            <Card className="bg-card/80 backdrop-blur-sm border-border/50"><CardContent className="p-4 text-center"><BarChart3 className="w-5 h-5 text-blue-400 mx-auto mb-2" /><p className="text-2xl font-bold">{avgScore.toLocaleString()}</p><p className="text-xs text-muted-foreground">30-Day Avg</p></CardContent></Card>
            <Card className="bg-card/80 backdrop-blur-sm border-border/50"><CardContent className="p-4 text-center"><Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-2" /><p className="text-2xl font-bold">{bestRank === 9999 ? "-" : `#${bestRank}`}</p><p className="text-xs text-muted-foreground">Best Rank</p></CardContent></Card>
            <Card className="bg-card/80 backdrop-blur-sm border-border/50"><CardContent className="p-4 text-center">{scoreTrend >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" /> : <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-2" />}<p className={cn("text-2xl font-bold", scoreTrend >= 0 ? "text-emerald-400" : "text-red-400")}>{scoreTrend >= 0 ? "+" : ""}{scoreTrend.toLocaleString()}</p><p className="text-xs text-muted-foreground">Daily Change</p></CardContent></Card>
          </div>
          {history.length > 0 ? (
            <div className="space-y-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="p-6"><div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-primary" /><h3 className="font-semibold text-lg">Score Trajectory</h3></div><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}><defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a3ff12" stopOpacity={0.3} /><stop offset="95%" stopColor="#a3ff12" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" /><XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="score" name="Daily Score" stroke="#a3ff12" strokeWidth={2} fill="url(#scoreGradient)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
              {dayOfWeekAverages.length > 0 && (<Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="p-6"><div className="flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-blue-400" /><h3 className="font-semibold text-lg">Performance by Day</h3></div><div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={dayOfWeekAverages} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={({ active, payload, label }) => { if (active && payload && payload.length) { return (<div className="bg-background border border-border p-3 rounded-lg shadow-lg"><p className="font-semibold mb-1">{label}</p><p className="text-sm" style={{ color: "#a3ff12" }}>Avg: {payload[0].value?.toLocaleString()} pts</p></div>); } return null; }} /><Bar dataKey="avgScore" fill="#a3ff12" radius={[4, 4, 0, 0]} maxBarSize={50} /></BarChart></ResponsiveContainer></div></CardContent></Card>)}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="p-6"><div className="flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-yellow-500" /><h3 className="font-semibold text-lg">Rank History</h3></div><div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" /><XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })} /><YAxis reversed tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} domain={[1, "auto"]} allowDecimals={false} /><Tooltip content={<CustomTooltip />} /><Line type="stepAfter" dataKey="rank" name="Rank" stroke="#eab308" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          ) : (<Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="p-12 text-center"><BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" /><h3 className="font-semibold text-lg mb-2">No History Data</h3><p className="text-muted-foreground">Historical performance data is not yet available for this entity.</p></CardContent></Card>)}
          <Card className="mt-8 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-purple-500/10 border-emerald-500/20"><CardContent className="p-8 text-center"><Target className="w-10 h-10 text-emerald-400 mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">Draft {entity.name} in Your Team</h2><p className="text-muted-foreground mb-6 max-w-md mx-auto">Add this {entityTypeLabels[entityType].toLowerCase()} to your fantasy roster and compete against other players based on real market performance.</p><Link href="/sign-up"><Button className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500">Start Playing<ExternalLink className="w-4 h-4" /></Button></Link></CardContent></Card>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}

