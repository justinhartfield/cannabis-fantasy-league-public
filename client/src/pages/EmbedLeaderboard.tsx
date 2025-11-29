import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RankBadgeInline } from "@/components/RankBadge";
import { Trophy, ExternalLink } from "lucide-react";

type EntityType = "manufacturer" | "pharmacy" | "brand" | "product" | "strain";
const entityLabels: Record<EntityType, string> = { manufacturer: "Top Manufacturers", pharmacy: "Top Pharmacies", brand: "Top Brands", product: "Top Products", strain: "Top Strains" };

export default function EmbedLeaderboard() {
  const [, params] = useRoute("/embed/leaderboard/:type");
  const entityType = (params?.type as EntityType) || "manufacturer";
  const urlParams = new URLSearchParams(window.location.search);
  const theme = urlParams.get("theme") || "dark";
  const limit = Math.min(Math.max(parseInt(urlParams.get("limit") || "5"), 1), 10);
  const showHeader = urlParams.get("header") !== "false";
  const showAttribution = urlParams.get("attribution") !== "false";

  const { data, isLoading } = trpc.leaderboard.getMiniLeaderboard.useQuery({ entityType, limit, theme: theme as "light" | "dark" | "auto" });
  const isDark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const baseUrl = window.location.origin;

  if (isLoading) {
    return (<div className={cn("flex items-center justify-center h-full min-h-[200px] font-sans", isDark ? "bg-[#111827] text-white" : "bg-white text-gray-900")}><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>);
  }

  return (
    <div className={cn("flex flex-col h-full min-h-[200px] font-sans overflow-hidden", isDark ? "bg-[#111827] text-white" : "bg-white text-gray-900")} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {showHeader && (<div className={cn("flex items-center justify-between px-4 py-3 border-b", isDark ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50")}><div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-emerald-500" /><span className="font-semibold text-sm">{entityLabels[entityType]}</span></div>{data?.date && <span className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>{new Date(data.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>}</div>)}
      <div className="flex-1 overflow-auto">
        {data?.items && data.items.length > 0 ? (
          <div className="divide-y divide-white/5">
            {data.items.map((item) => (
              <a key={item.id} href={`${baseUrl}/entity/${entityType}/${item.id}`} target="_blank" rel="noopener noreferrer" className={cn("flex items-center justify-between px-4 py-2.5 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                <div className="flex items-center gap-3"><RankBadgeInline rank={item.rank} /><Avatar className="w-7 h-7"><AvatarImage src={item.imageUrl || undefined} /><AvatarFallback className={cn("text-[10px] font-medium", isDark ? "bg-white/10" : "bg-gray-100")}>{item.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="text-sm font-medium truncate max-w-[120px]">{item.name}</span></div>
                <span className="text-sm font-bold text-emerald-500">{item.score.toLocaleString()}</span>
              </a>
            ))}
          </div>
        ) : (<div className={cn("flex items-center justify-center h-full text-sm", isDark ? "text-gray-400" : "text-gray-500")}>No data available</div>)}
      </div>
      {showAttribution && (<a href={baseUrl} target="_blank" rel="noopener noreferrer" className={cn("flex items-center justify-center gap-1.5 px-4 py-2 text-xs border-t transition-colors", isDark ? "border-white/10 text-gray-400 hover:text-white hover:bg-white/5" : "border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-50")}><span>Powered by</span><span className="font-semibold text-emerald-500">CFL</span><ExternalLink className="w-3 h-3" /></a>)}
    </div>
  );
}

