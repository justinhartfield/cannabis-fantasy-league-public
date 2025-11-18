import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Trophy, BarChart3, Flame, Zap, Target, TrendingUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoringComponent {
  category: string;
  value: number | string;
  formula: string;
  points: number;
}

interface ScoringBonus {
  type: string;
  condition: string;
  points: number;
}

interface ScoringPenalty {
  type: string;
  condition: string;
  points: number;
}

interface ScoringBreakdownData {
  assetName: string;
  assetType: "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";
  imageUrl?: string | null;
  components: ScoringComponent[];
  bonuses: ScoringBonus[];
  penalties: ScoringPenalty[];
  subtotal: number;
  total: number;
  // New trend-based fields
  trendMultiplier?: number;
  streakDays?: number;
  marketSharePercent?: number;
  consistencyScore?: number;
  velocityScore?: number;
}

interface ScoringBreakdownProps {
  data: ScoringBreakdownData;
  leagueAverage?: number;
  weeklyTrend?: number[];
  useTrendDisplay?: boolean; // Toggle between old and new display
}

/**
 * ScoringBreakdownV2 Component
 * 
 * Enhanced scoring breakdown with trend-based metrics display.
 * Shows relative performance indicators instead of explicit sales data.
 */
export default function ScoringBreakdownV2({
  data,
  leagueAverage,
  weeklyTrend,
  useTrendDisplay = true,
}: ScoringBreakdownProps) {
  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case "manufacturer":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cannabis_strain":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "product":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "pharmacy":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "brand":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case "manufacturer":
        return "Hersteller";
      case "cannabis_strain":
        return "Cannabis Strain";
      case "product":
        return "Produkt";
      case "pharmacy":
        return "Apotheke";
      case "brand":
        return "Brand";
      default:
        return type;
    }
  };

  const getTrendIcon = (multiplier?: number) => {
    if (!multiplier) return null;
    if (multiplier >= 5) return <Flame className="w-4 h-4 text-orange-500" />;
    if (multiplier >= 2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (multiplier >= 1) return <Minus className="w-4 h-4 text-gray-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTrendColor = (multiplier?: number) => {
    if (!multiplier) return "text-gray-500";
    if (multiplier >= 5) return "text-orange-500";
    if (multiplier >= 2) return "text-green-500";
    if (multiplier >= 1) return "text-gray-500";
    return "text-red-500";
  };

  const getBonusIcon = (type: string) => {
    if (type.includes("Streak")) return <Flame className="w-4 h-4" />;
    if (type.includes("Velocity")) return <Zap className="w-4 h-4" />;
    if (type.includes("Consistency")) return <Target className="w-4 h-4" />;
    if (type.includes("Market")) return <TrendingUpDown className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  const vsLeagueAverage = leagueAverage ? data.total - leagueAverage : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            {data.imageUrl && (
              <img 
                src={data.imageUrl} 
                alt={data.assetName}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-border"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            )}
            <div>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                {!data.imageUrl && <BarChart3 className="w-5 h-5" />}
                {data.assetName}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1 flex items-center gap-2">
                <Badge variant="outline" className={getAssetTypeColor(data.assetType)}>
                  {getAssetTypeLabel(data.assetType)}
                </Badge>
                {/* Trend indicator badge */}
                {useTrendDisplay && data.trendMultiplier && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={`${getTrendColor(data.trendMultiplier)} border-current`}>
                          {getTrendIcon(data.trendMultiplier)}
                          <span className="ml-1">{data.trendMultiplier.toFixed(1)}x</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Trend Momentum: {data.trendMultiplier.toFixed(2)}x growth</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Streak indicator */}
                {useTrendDisplay && data.streakDays && data.streakDays > 1 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                          <Flame className="w-3 h-3 mr-1" />
                          {data.streakDays}d
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{data.streakDays} consecutive days in top 10</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-3xl font-bold text-foreground">{data.total}</div>
            <div className="text-sm text-muted-foreground">Punkte</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trend Metrics Summary (New) */}
        {useTrendDisplay && (data.trendMultiplier || data.consistencyScore || data.velocityScore || data.marketSharePercent) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            {data.trendMultiplier && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Momentum</div>
                <div className={`text-lg font-bold ${getTrendColor(data.trendMultiplier)}`}>
                  {data.trendMultiplier.toFixed(1)}x
                </div>
              </div>
            )}
            {data.consistencyScore !== undefined && data.consistencyScore > 0 && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Consistency</div>
                <div className="text-lg font-bold text-blue-500">
                  {data.consistencyScore}/100
                </div>
              </div>
            )}
            {data.velocityScore !== undefined && data.velocityScore !== 0 && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Velocity</div>
                <div className={`text-lg font-bold ${data.velocityScore > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {data.velocityScore > 0 ? '+' : ''}{data.velocityScore}
                </div>
              </div>
            )}
            {data.marketSharePercent !== undefined && data.marketSharePercent > 0 && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Market Share</div>
                <div className="text-lg font-bold text-purple-500">
                  {data.marketSharePercent.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        {/* Components */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Scoring-Komponenten</h4>
          <div className="space-y-1">
            {data.components.map((component, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-md bg-muted/50 gap-2"
              >
                <div className="flex-1 w-full sm:w-auto">
                  <div className="text-sm font-medium text-foreground mb-1">
                    {component.category}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {component.value} → {component.formula}
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="text-lg font-bold text-foreground">
                    {component.points}
                  </div>
                  <div className="text-xs text-muted-foreground">pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bonuses */}
        {data.bonuses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Boni
            </h4>
            <div className="space-y-1">
              {data.bonuses.map((bonus, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-md bg-green-500/5 border border-green-500/20 gap-2"
                >
                  <div className="flex items-center gap-2">
                    {getBonusIcon(bonus.type)}
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {bonus.type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bonus.condition}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    +{bonus.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Penalties */}
        {data.penalties.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Strafen
            </h4>
            <div className="space-y-1">
              {data.penalties.map((penalty, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-md bg-red-500/5 border border-red-500/20 gap-2"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {penalty.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {penalty.condition}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    {penalty.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subtotal */}
        <div className="border-t border-border pt-3 mt-3">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/80">
            <div>
              <div className="text-sm font-semibold text-foreground">Gesamtpunktzahl</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.components.length} Komponenten + {data.bonuses.length} Boni
                {data.penalties.length > 0 && ` - ${data.penalties.length} Strafen`}
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{data.total}</div>
          </div>
        </div>

        {/* League Average Comparison */}
        {vsLeagueAverage !== null && (
          <div className="flex items-center justify-between p-3 rounded-md bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <div className="text-sm font-medium text-foreground">
                vs. Liga-Durchschnitt
              </div>
            </div>
            <div className="flex items-center gap-2">
              {vsLeagueAverage > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">
                    +{vsLeagueAverage.toFixed(1)}
                  </span>
                </>
              ) : vsLeagueAverage < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-600">
                    {vsLeagueAverage.toFixed(1)}
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    0.0
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Weekly Trend */}
        {weeklyTrend && weeklyTrend.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Wöchentlicher Trend</h4>
            <div className="flex items-end gap-1 h-20">
              {weeklyTrend.map((points, idx) => {
                const maxPoints = Math.max(...weeklyTrend);
                const height = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/20 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs text-muted-foreground">
                      W{idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
