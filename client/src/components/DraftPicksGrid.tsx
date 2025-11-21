import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Flame, Star, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamAvatar } from "@/components/TeamAvatar";

interface DraftPick {
  pickNumber: number;
  round: number;
  teamId: number;
  teamName: string;
  assetType: string;
  assetId: number;
  assetName: string;
  imageUrl?: string | null;
  lastWeekPoints: number | null;
  trendPercent: number | null;
  pickTime: string;
  userAvatarUrl?: string | null;
  userName?: string | null;
}

interface DraftPicksGridProps {
  picks: DraftPick[];
  currentPickNumber?: number;
}

const ASSET_EMOJIS: Record<string, string> = {
  manufacturer: "🏭",
  cannabis_strain: "🌿",
  product: "💊",
  pharmacy: "🏥",
  brand: "🏷️",
};

const ASSET_COLORS: Record<string, string> = {
  manufacturer: "border-blue-500/30 bg-blue-500/5",
  cannabis_strain: "border-purple-500/30 bg-purple-500/5",
  product: "border-pink-500/30 bg-pink-500/5",
  pharmacy: "border-green-500/30 bg-green-500/5",
  brand: "border-yellow-500/30 bg-yellow-500/5",
};

export function DraftPicksGrid({ picks, currentPickNumber }: DraftPicksGridProps) {
  // Sort picks by pick number descending (latest first)
  const sortedPicks = [...picks].sort((a, b) => b.pickNumber - a.pickNumber);
  
  // The latest pick is the one with the highest pick number
  const latestPickNumber = sortedPicks.length > 0 ? sortedPicks[0].pickNumber : 0;

  if (picks.length === 0) {
    return (
      <Card className="bg-weed-purple border-2 border-weed-green">
        <CardHeader>
          <CardTitle className="headline-secondary text-white uppercase">Draft Board</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/70 text-center py-8">
            Noch keine Picks
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: number | null) => {
    if (trend === null) return <Minus className="w-3 h-3" />;
    if (trend > 5) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend < -5) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getSpecialBadge = (pick: DraftPick) => {
    const points = pick.lastWeekPoints || 0;
    const trend = pick.trendPercent || 0;
    
    // Top scorer badge
    if (points > 200) {
      return (
        <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
          <Flame className="w-3 h-3 mr-1" />
          Feuer
        </Badge>
      );
    }
    
    // Rising star badge
    if (trend > 30) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
          <Star className="w-3 h-3 mr-1" />
          Rising
        </Badge>
      );
    }
    
    // Value pick (high points in late rounds)
    if (points > 150 && pick.round >= 3) {
      return (
        <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 text-xs">
          <Gem className="w-3 h-3 mr-1" />
          Value
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <Card className="bg-weed-purple border-2 border-weed-green">
      <CardHeader>
        <CardTitle className="headline-secondary flex items-center justify-between text-white uppercase">
          <span>Draft Board</span>
          <Badge className="bg-weed-green text-black border-0">{picks.length} Picks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8 gap-3">
          {sortedPicks.map((pick) => {
            const emoji = ASSET_EMOJIS[pick.assetType] || "📦";
            const colorClass = ASSET_COLORS[pick.assetType] || "border-border bg-card";
            // Highlight if this is the latest pick
            const isNewestPick = pick.pickNumber === latestPickNumber;
            const specialBadge = getSpecialBadge(pick);

            return (
              <div
                key={`${pick.pickNumber}-${pick.assetId}`}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all duration-300 bg-white",
                  isNewestPick ? "border-weed-green ring-2 ring-weed-green glow-primary scale-105 slide-in-bottom" : "border-white/20"
                )}
              >
                {/* Header: Pick Number & Badge */}
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    R{pick.round} #{pick.pickNumber}
                  </Badge>
                  {specialBadge}
                </div>

                {/* Asset Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {pick.imageUrl ? (
                      <img 
                        src={pick.imageUrl} 
                        alt={pick.assetName}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const emojiSpan = e.currentTarget.nextElementSibling as HTMLElement;
                          if (emojiSpan) emojiSpan.style.display = 'inline';
                        }}
                      />
                    ) : null}
                    <span className="text-lg flex-shrink-0" style={{ display: pick.imageUrl ? 'none' : 'inline' }}>{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {pick.assetName}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <TeamAvatar avatarUrl={pick.userAvatarUrl} teamName={pick.teamName} userName={pick.userName} size="sm" />
                        <p className="text-xs text-muted-foreground truncate">
                          {pick.teamName}
                        </p>
                      </div>
                    </div>
                  </div>


                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

