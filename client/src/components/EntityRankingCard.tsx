import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RankBadge, RankBadgeInline } from "./RankBadge";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface EntityRankingCardProps {
  id: number;
  name: string;
  type: "manufacturer" | "pharmacy" | "brand" | "product" | "strain";
  rank: number;
  score: number;
  imageUrl?: string | null;
  previousRank?: number;
  compact?: boolean;
  onClick?: () => void;
  linkTo?: string;
  className?: string;
}

export function EntityRankingCard({
  id,
  name,
  type,
  rank,
  score,
  imageUrl,
  previousRank,
  compact = false,
  onClick,
  linkTo,
  className,
}: EntityRankingCardProps) {
  const rankChange = previousRank ? previousRank - rank : 0;

  const content = compact ? (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm transition-all",
        (onClick || linkTo) && "cursor-pointer hover:bg-accent/50 hover:border-primary/30 hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <RankBadge rank={rank} size="sm" showTrend={false} />
        <Avatar className="w-8 h-8 border border-border/50">
          <AvatarImage src={imageUrl || undefined} />
          <AvatarFallback className="text-xs bg-muted">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate max-w-[120px]">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-primary text-sm">
          {score.toLocaleString()}
        </span>
        {linkTo && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
      </div>
    </div>
  ) : (
    <div
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/50 backdrop-blur-sm transition-all duration-300",
        (onClick || linkTo) && "cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01]",
        rank === 1 && "border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent",
        rank === 2 && "border-slate-400/30 bg-gradient-to-br from-slate-400/10 to-transparent",
        rank === 3 && "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent",
        className
      )}
      onClick={onClick}
    >
      <RankBadge rank={rank} previousRank={previousRank} size="lg" />
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar className="w-14 h-14 border-2 border-border/50 shadow-md">
          <AvatarImage src={imageUrl || undefined} />
          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-muted to-background">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{type.replace("_", " ")}</span>
            {rankChange !== 0 && (
              <span className={cn("flex items-center gap-0.5 text-xs font-medium", rankChange > 0 ? "text-emerald-400" : "text-red-400")}>
                {rankChange > 0 ? <><TrendingUp className="w-3 h-3" /><span>+{rankChange}</span></> : <><TrendingDown className="w-3 h-3" /><span>{rankChange}</span></>}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
          {score.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">points</div>
      </div>
      {linkTo && <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }
  return content;
}

export function EntityRankingListItem({ rank, name, score, imageUrl, className }: { rank: number; name: string; score: number; imageUrl?: string | null; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between py-2 px-3 border-b border-border/30 last:border-0", className)}>
      <div className="flex items-center gap-2">
        <RankBadgeInline rank={rank} />
        <Avatar className="w-6 h-6">
          <AvatarImage src={imageUrl || undefined} />
          <AvatarFallback className="text-[10px]">{name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate max-w-[100px]">{name}</span>
      </div>
      <span className="text-sm font-bold text-primary">{score.toLocaleString()}</span>
    </div>
  );
}

