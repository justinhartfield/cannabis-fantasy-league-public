import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Trophy, BarChart3, Info } from "lucide-react";
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
}

interface ScoringBreakdownProps {
  data: ScoringBreakdownData;
  leagueAverage?: number;
  weeklyTrend?: number[];
}

/**
 * ScoringBreakdown Component
 * 
 * Displays detailed scoring breakdown for a player/asset:
 * - Points per category
 * - Bonuses and penalties
 * - Comparison with league average
 * - Weekly trends
 */
export default function ScoringBreakdown({
  data,
  leagueAverage,
  weeklyTrend,
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
              <CardDescription className="text-muted-foreground mt-1">
                <Badge variant="outline" className={getAssetTypeColor(data.assetType)}>
                  {getAssetTypeLabel(data.assetType)}
                </Badge>
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
                    {component.value} × {component.formula} = {component.points} pts
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
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {bonus.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {bonus.condition}
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
              <div className="text-sm font-semibold text-foreground">Zwischensumme</div>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                {data.components.map((c, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}{c.points}
                  </span>
                ))}
                {data.bonuses.length > 0 && data.bonuses.map((b, i) => (
                  <span key={`b${i}`}> + {b.points}</span>
                ))}
                {data.penalties.length > 0 && data.penalties.map((p, i) => (
                  <span key={`p${i}`}> {p.points}</span>
                ))}
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
