import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RankBadge } from "@/components/RankBadge";
import { DisplayModeSEO } from "@/components/SEO";
import { Trophy, Factory, Store, Sparkles, Leaf, Pill, RefreshCw, QrCode, Maximize, Monitor } from "lucide-react";

type EntityCategory = "manufacturer" | "pharmacy" | "brand" | "product" | "strain";
const categoryConfig: Record<EntityCategory, { icon: typeof Factory; label: string; color: string }> = {
  manufacturer: { icon: Factory, label: "Manufacturers", color: "text-blue-400" },
  pharmacy: { icon: Store, label: "Pharmacies", color: "text-purple-400" },
  brand: { icon: Sparkles, label: "Brands", color: "text-pink-400" },
  product: { icon: Pill, label: "Products", color: "text-amber-400" },
  strain: { icon: Leaf, label: "Strains", color: "text-emerald-400" },
};

export default function DisplayMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = (urlParams.get("category") as EntityCategory | "all") || "all";
  const refreshInterval = parseInt(urlParams.get("refresh") || "60") * 1000;
  const rotateInterval = parseInt(urlParams.get("rotate") || "10") * 1000;
  const showQR = urlParams.get("qr") !== "false";
  const showClock = urlParams.get("clock") !== "false";

  const [currentCategory, setCurrentCategory] = useState<EntityCategory | "all">(initialCategory);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const categories: EntityCategory[] = ["manufacturer", "pharmacy", "brand", "strain", "product"];
  const [categoryIndex, setCategoryIndex] = useState(0);

  useEffect(() => { if (initialCategory === "all") { const timer = setInterval(() => setCategoryIndex((prev) => (prev + 1) % categories.length), rotateInterval); return () => clearInterval(timer); } }, [initialCategory, rotateInterval]);
  useEffect(() => { if (initialCategory === "all") setCurrentCategory(categories[categoryIndex]); }, [categoryIndex, initialCategory]);
  useEffect(() => { if (showClock) { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); } }, [showClock]);

  const { data, refetch } = trpc.leaderboard.getDailyEntityLeaderboard.useQuery({ limit: 10 }, { refetchInterval: refreshInterval });

  const getCurrentData = () => {
    if (!data) return [];
    const cat = currentCategory === "all" ? categories[categoryIndex] : currentCategory;
    const dataMap: Record<EntityCategory, any[]> = { manufacturer: data.manufacturers || [], pharmacy: data.pharmacies || [], brand: data.brands || [], product: data.products || [], strain: data.strains || [] };
    return dataMap[cat] || [];
  };

  const activeCategory = currentCategory === "all" ? categories[categoryIndex] : currentCategory;
  const config = categoryConfig[activeCategory];
  const Icon = config.icon;
  const items = getCurrentData();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/rankings/${activeCategory}`)}&bgcolor=111827&color=10b981`;

  const toggleFullscreen = () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white overflow-hidden">
      <DisplayModeSEO />
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-purple-900/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/30 via-transparent to-transparent pointer-events-none" />
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-4"><Trophy className="w-10 h-10 text-emerald-500" /><div><h1 className="text-2xl font-black tracking-tight">Cannabis Fantasy League</h1><p className="text-sm text-emerald-400 font-medium">Official Market Rankings</p></div></div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10"><Icon className={cn("w-6 h-6", config.color)} /><span className="text-lg font-bold">{config.label}</span></div>
          {showClock && <div className="text-3xl font-mono font-bold text-white/80">{currentTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>}
          <div className="flex items-center gap-2"><button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Refresh"><RefreshCw className="w-5 h-5" /></button><button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Toggle Fullscreen">{isFullscreen ? <Monitor className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</button></div>
        </div>
      </header>
      <main className="relative z-10 flex flex-col lg:flex-row gap-8 p-8 h-[calc(100vh-88px)]">
        <div className="flex-1 flex flex-col">
          <div className="grid gap-4">
            {items.slice(0, 10).map((item, index) => (
              <div key={item.id} className={cn("flex items-center gap-6 p-5 rounded-2xl transition-all duration-500 bg-gradient-to-r from-white/5 to-transparent border border-white/10", index === 0 && "from-yellow-500/10 border-yellow-500/30 scale-[1.02]", index === 1 && "from-slate-400/10 border-slate-400/30", index === 2 && "from-amber-600/10 border-amber-600/30")} style={{ animationDelay: `${index * 100}ms` }}>
                <RankBadge rank={index + 1} size="lg" />
                <Avatar className="w-16 h-16 border-2 border-white/20"><AvatarImage src={item.logoUrl || item.imageUrl} /><AvatarFallback className="text-xl font-bold bg-gradient-to-br from-emerald-900 to-emerald-950">{item.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><h2 className="text-2xl font-bold truncate">{item.name}</h2><p className="text-sm text-white/50 capitalize">{activeCategory.replace("_", " ")}</p></div>
                <div className="text-right"><div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{item.score.toLocaleString()}</div><div className="text-sm text-white/50 uppercase tracking-wider">points</div></div>
              </div>
            ))}
          </div>
        </div>
        {showQR && (
          <div className="lg:w-64 flex flex-col gap-6">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 text-center"><QrCode className="w-8 h-8 mx-auto mb-3 text-emerald-500" /><p className="text-sm text-white/70 mb-4">Scan to view full rankings</p><div className="bg-[#111827] p-3 rounded-xl inline-block"><img src={qrUrl} alt="QR Code" className="w-[120px] h-[120px]" /></div><p className="mt-4 text-xs text-white/50">cfl.weed.de/rankings</p></div>
            {initialCategory === "all" && (<div className="bg-white/5 rounded-2xl border border-white/10 p-4"><p className="text-xs text-white/50 uppercase tracking-wider mb-3">Categories</p><div className="space-y-2">{categories.map((cat, i) => { const catConfig = categoryConfig[cat]; const CatIcon = catConfig.icon; return (<div key={cat} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg transition-all", categoryIndex === i ? "bg-emerald-500/20 border border-emerald-500/30" : "opacity-50")}><CatIcon className={cn("w-4 h-4", catConfig.color)} /><span className="text-sm font-medium">{catConfig.label}</span></div>); })}</div></div>)}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 text-center"><p className="text-xs text-white/50">Data updates every {refreshInterval / 1000}s</p><p className="text-xs text-emerald-400 mt-1">{data?.date && new Date(data.date).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p></div>
          </div>
        )}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm border-t border-white/10 py-2 overflow-hidden"><div className="animate-marquee whitespace-nowrap"><span className="mx-4 text-sm text-white/70">🌿 Cannabis Fantasy League - The Official Metagame of the German Cannabis Market</span><span className="mx-4 text-sm text-emerald-400">Draft your team • Compete for glory • Win prizes</span><span className="mx-4 text-sm text-white/70">cfl.weed.de</span><span className="mx-4 text-sm text-white/70">🌿 Cannabis Fantasy League - The Official Metagame of the German Cannabis Market</span><span className="mx-4 text-sm text-emerald-400">Draft your team • Compete for glory • Win prizes</span><span className="mx-4 text-sm text-white/70">cfl.weed.de</span></div></footer>
      <style>{`@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .animate-marquee { animation: marquee 30s linear infinite; }`}</style>
    </div>
  );
}

