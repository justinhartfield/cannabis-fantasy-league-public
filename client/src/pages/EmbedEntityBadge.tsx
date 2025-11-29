import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, ExternalLink } from "lucide-react";

type EntityType = "manufacturer" | "pharmacy" | "brand" | "product" | "strain";

export default function EmbedEntityBadge() {
  const [, params] = useRoute("/embed/entity/:type/:id");
  const entityType = params?.type as EntityType;
  const entityId = parseInt(params?.id || "0", 10);
  const urlParams = new URLSearchParams(window.location.search);
  const theme = urlParams.get("theme") || "dark";
  const style = urlParams.get("style") || "standard";
  const showScore = urlParams.get("score") !== "false";
  const showAttribution = urlParams.get("attribution") !== "false";

  const { data, isLoading } = trpc.leaderboard.getEntityRank.useQuery({ entityType, entityId }, { enabled: !!entityType && !!entityId });
  const isDark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const baseUrl = window.location.origin;

  if (isLoading) { return (<div className={cn("flex items-center justify-center h-full min-h-[60px] font-sans", isDark ? "bg-[#111827] text-white" : "bg-white text-gray-900")}><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>); }
  if (!data) { return (<div className={cn("flex items-center justify-center h-full min-h-[60px] font-sans text-sm", isDark ? "bg-[#111827] text-gray-400" : "bg-white text-gray-500")}>Entity not found</div>); }

  if (style === "minimal") {
    return (<a href={`${baseUrl}/entity/${entityType}/${entityId}`} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-sm font-semibold transition-transform hover:scale-105", data.rank && data.rank <= 3 ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-500 border border-yellow-500/30" : data.rank && data.rank <= 10 ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" : isDark ? "bg-white/10 text-white border border-white/20" : "bg-gray-100 text-gray-900 border border-gray-200")} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}><TrendingUp className="w-3.5 h-3.5" /><span>#{data.rank}</span>{showAttribution && <span className="text-xs opacity-60">CFL</span>}</a>);
  }

  if (style === "compact") {
    return (<a href={`${baseUrl}/entity/${entityType}/${entityId}`} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-3 px-4 py-2 rounded-xl font-sans transition-all hover:scale-[1.02]", isDark ? "bg-[#111827] border border-white/10 hover:border-emerald-500/30" : "bg-white border border-gray-200 hover:border-emerald-500/50")} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}><div className={cn("flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm", data.rank && data.rank <= 3 ? "bg-gradient-to-br from-yellow-500/20 to-amber-500/20 text-yellow-500" : data.rank && data.rank <= 10 ? "bg-emerald-500/20 text-emerald-500" : isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-900")}>#{data.rank}</div><div className="flex-1 min-w-0"><p className={cn("font-semibold text-sm truncate", isDark ? "text-white" : "text-gray-900")}>{data.name}</p>{showScore && <p className="text-xs text-emerald-500 font-medium">{data.score.toLocaleString()} pts</p>}</div><ExternalLink className={cn("w-4 h-4", isDark ? "text-gray-500" : "text-gray-400")} /></a>);
  }

  return (
    <a href={`${baseUrl}/entity/${entityType}/${entityId}`} target="_blank" rel="noopener noreferrer" className={cn("flex flex-col rounded-2xl font-sans overflow-hidden transition-all hover:scale-[1.01]", isDark ? "bg-[#111827] border border-white/10 hover:border-emerald-500/30" : "bg-white border border-gray-200 shadow-sm hover:border-emerald-500/50")} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div className={cn("flex items-center justify-between px-4 py-3", data.rank && data.rank <= 3 ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10" : data.rank && data.rank <= 10 ? "bg-emerald-500/10" : isDark ? "bg-white/5" : "bg-gray-50")}>
        <div className="flex items-center gap-3"><Avatar className="w-10 h-10 border-2 border-white/10"><AvatarImage src={data.imageUrl || undefined} /><AvatarFallback className={cn("font-bold", isDark ? "bg-white/10" : "bg-gray-100")}>{data.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><p className={cn("font-bold text-base", isDark ? "text-white" : "text-gray-900")}>{data.name}</p><p className={cn("text-xs capitalize", isDark ? "text-gray-400" : "text-gray-500")}>{entityType}</p></div></div>
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg", data.rank && data.rank <= 3 ? "bg-gradient-to-br from-yellow-500/30 to-amber-500/30 text-yellow-500" : data.rank && data.rank <= 10 ? "bg-emerald-500/20 text-emerald-500" : isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-900")}>#{data.rank}</div>
      </div>
      {showScore && (<div className={cn("px-4 py-3 border-t", isDark ? "border-white/5" : "border-gray-100")}><div className="flex items-center justify-between"><span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Daily Score</span><span className="text-lg font-bold text-emerald-500">{data.score.toLocaleString()}</span></div></div>)}
      {showAttribution && (<div className={cn("flex items-center justify-center gap-1.5 px-4 py-2 text-xs border-t", isDark ? "border-white/5 text-gray-500" : "border-gray-100 text-gray-400")}><span>Powered by</span><span className="font-semibold text-emerald-500">Cannabis Fantasy League</span></div>)}
    </a>
  );
}

