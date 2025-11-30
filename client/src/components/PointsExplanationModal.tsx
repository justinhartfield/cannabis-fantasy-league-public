import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HelpCircle,
  TrendingUp,
  BarChart3,
  Layers,
  Calculator,
  Clock,
  Info,
  Shield,
  Eye,
} from "lucide-react";

export interface MetricBreakdown {
  name: string;
  description: string;
  rawValue: number | string;
  bucket: string;
  formula: string;
  points: number;
  timeWindow: string;
}

export interface BonusBreakdown {
  name: string;
  description: string;
  condition: string;
  points: number;
  applied: boolean;
}

export interface PointsExplanationData {
  entityName: string;
  entityType: "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";
  entityImage?: string | null;
  totalPoints: number;
  metrics: MetricBreakdown[];
  bonuses: BonusBreakdown[];
  dataTimestamp: string;
}

interface PointsExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PointsExplanationData | null;
}

const getEntityTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    manufacturer: "Manufacturer",
    cannabis_strain: "Strain",
    product: "Product",
    pharmacy: "Pharmacy",
    brand: "Brand",
  };
  return labels[type] || type;
};

const getEntityTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    manufacturer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cannabis_strain: "bg-green-500/20 text-green-400 border-green-500/30",
    product: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    pharmacy: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    brand: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return colors[type] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
};

export function PointsExplanationModal({
  open,
  onOpenChange,
  data,
}: PointsExplanationModalProps) {
  if (!data) return null;

  const appliedBonuses = data.bonuses.filter((b) => b.applied);
  const basePoints = data.metrics.reduce((sum, m) => sum + m.points, 0);
  const bonusPoints = appliedBonuses.reduce((sum, b) => sum + b.points, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-weed-green/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-weed-green" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left flex items-center gap-2">
                Why did I get these points?
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                Detailed breakdown for scoring transparency
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Entity Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          {data.entityImage && (
            <img
              src={data.entityImage}
              alt={data.entityName}
              className="w-12 h-12 rounded-lg object-cover border border-border"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {data.entityName}
            </h3>
            <Badge
              variant="outline"
              className={`text-xs mt-1 ${getEntityTypeColor(data.entityType)}`}
            >
              {getEntityTypeLabel(data.entityType)}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-weed-green">
              {data.totalPoints}
            </div>
            <div className="text-xs text-muted-foreground">total pts</div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            All metrics are <strong className="text-foreground">aggregated and anonymized</strong>.
            Raw values are rounded & bucketed to protect individual data.
          </p>
        </div>

        <Separator />

        {/* Metrics Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Metric Breakdown
          </h4>

          <div className="space-y-2">
            {data.metrics.map((metric, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-card border border-border space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-foreground text-sm">
                      {metric.name}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {metric.description}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="flex-shrink-0 text-sm font-bold"
                  >
                    +{metric.points}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      Bucket:{" "}
                      <span className="text-foreground font-medium">
                        {metric.bucket}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{metric.timeWindow}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                  <Calculator className="w-3.5 h-3.5" />
                  <code className="font-mono">{metric.formula}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Base Points Subtotal */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">Base Points</span>
            <span className="font-semibold text-foreground">{basePoints}</span>
          </div>
        </div>

        {/* Bonuses */}
        {data.bonuses.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Bonuses & Multipliers
              </h4>

              <div className="space-y-2">
                {data.bonuses.map((bonus, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      bonus.applied
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-muted/30 border-border opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-foreground text-sm">
                            {bonus.name}
                          </h5>
                          {bonus.applied ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              Applied
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs opacity-50">
                              Not Applied
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {bonus.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Condition: {bonus.condition}
                        </p>
                      </div>
                      <span
                        className={`font-bold text-sm ${
                          bonus.applied ? "text-green-400" : "text-muted-foreground"
                        }`}
                      >
                        +{bonus.points}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bonus Points Subtotal */}
              {bonusPoints > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                  <span className="text-sm text-green-400">Bonus Points</span>
                  <span className="font-semibold text-green-400">+{bonusPoints}</span>
                </div>
              )}
            </div>
          </>
        )}

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-weed-green/10 to-weed-coral/10 border border-weed-green/20">
          <span className="font-semibold text-foreground">Total Points</span>
          <span className="text-3xl font-bold bg-gradient-to-r from-weed-green to-weed-coral bg-clip-text text-transparent">
            {data.totalPoints}
          </span>
        </div>

        {/* Data Timestamp */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Eye className="w-3.5 h-3.5" />
          <span>Data as of: {data.dataTimestamp}</span>
        </div>

        {/* Learn More Link */}
        <div className="text-center">
          <a
            href="/privacy"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" />
            Learn more about how we use data
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to generate sample/mock data for the PointsExplanationModal
 * In production, this would fetch real scoring breakdown from the API
 */
export function usePointsExplanation(
  entityType: string,
  entityId: number,
  entityName: string,
  totalPoints: number,
  entityImage?: string | null
): PointsExplanationData {
  // Generate mock breakdown based on entity type
  const baseMetrics: Record<string, MetricBreakdown[]> = {
    manufacturer: [
      {
        name: "Sales Volume",
        description: "Total units sold in time period",
        rawValue: "~2,450",
        bucket: "2,000-3,000 units",
        formula: "log(volume) × 15",
        points: Math.round(totalPoints * 0.4),
        timeWindow: "7-day rolling",
      },
      {
        name: "Market Share",
        description: "Percentage of total market",
        rawValue: "~8.2%",
        bucket: "5-10%",
        formula: "share% × 8",
        points: Math.round(totalPoints * 0.35),
        timeWindow: "7-day average",
      },
      {
        name: "Product Diversity",
        description: "Number of active SKUs",
        rawValue: "~15",
        bucket: "10-20 products",
        formula: "count × 2",
        points: Math.round(totalPoints * 0.25),
        timeWindow: "Current",
      },
    ],
    pharmacy: [
      {
        name: "Order Count",
        description: "Total orders processed",
        rawValue: "~340",
        bucket: "300-400 orders",
        formula: "log(orders) × 20",
        points: Math.round(totalPoints * 0.45),
        timeWindow: "7-day rolling",
      },
      {
        name: "Revenue Performance",
        description: "Relative revenue metric",
        rawValue: "High",
        bucket: "Top 25%",
        formula: "percentile × 0.6",
        points: Math.round(totalPoints * 0.35),
        timeWindow: "7-day rolling",
      },
      {
        name: "Customer Retention",
        description: "Repeat customer rate",
        rawValue: "~72%",
        bucket: "70-80%",
        formula: "rate × 0.5",
        points: Math.round(totalPoints * 0.2),
        timeWindow: "30-day rolling",
      },
    ],
    brand: [
      {
        name: "Engagement Score",
        description: "User interactions and favorites",
        rawValue: "~1,200",
        bucket: "1,000-1,500",
        formula: "log(engagement) × 12",
        points: Math.round(totalPoints * 0.5),
        timeWindow: "7-day rolling",
      },
      {
        name: "Sentiment Score",
        description: "Average user rating",
        rawValue: "~4.2",
        bucket: "4.0-4.5 stars",
        formula: "rating × 15",
        points: Math.round(totalPoints * 0.3),
        timeWindow: "30-day average",
      },
      {
        name: "Growth Trend",
        description: "Week-over-week growth",
        rawValue: "~12%",
        bucket: "10-15%",
        formula: "growth% × 3",
        points: Math.round(totalPoints * 0.2),
        timeWindow: "7-day comparison",
      },
    ],
    product: [
      {
        name: "Sales Velocity",
        description: "Units sold per day",
        rawValue: "~45",
        bucket: "40-60 units/day",
        formula: "velocity × 1.5",
        points: Math.round(totalPoints * 0.6),
        timeWindow: "7-day average",
      },
      {
        name: "Stock Turnover",
        description: "Inventory efficiency",
        rawValue: "High",
        bucket: "Top 30%",
        formula: "percentile × 0.4",
        points: Math.round(totalPoints * 0.4),
        timeWindow: "7-day rolling",
      },
    ],
    cannabis_strain: [
      {
        name: "Popularity Score",
        description: "Favorites and views",
        rawValue: "~850",
        bucket: "800-1,000",
        formula: "log(popularity) × 18",
        points: Math.round(totalPoints * 0.45),
        timeWindow: "7-day rolling",
      },
      {
        name: "Pharmacy Availability",
        description: "Number of pharmacies stocking",
        rawValue: "~22",
        bucket: "20-25 pharmacies",
        formula: "count × 2.5",
        points: Math.round(totalPoints * 0.35),
        timeWindow: "Current",
      },
      {
        name: "Price Stability",
        description: "Price variance metric",
        rawValue: "Stable",
        bucket: "±5%",
        formula: "stability × 4",
        points: Math.round(totalPoints * 0.2),
        timeWindow: "7-day rolling",
      },
    ],
  };

  const baseBonuses: BonusBreakdown[] = [
    {
      name: "Trend Bonus",
      description: "Awarded for strong week-over-week growth",
      condition: ">20% WoW growth",
      points: Math.round(totalPoints * 0.15),
      applied: totalPoints > 50,
    },
    {
      name: "Consistency Bonus",
      description: "Awarded for maintaining rank over time",
      condition: "Rank maintained 4+ weeks",
      points: Math.round(totalPoints * 0.1),
      applied: totalPoints > 70,
    },
  ];

  const metrics = baseMetrics[entityType] || baseMetrics.manufacturer;

  return {
    entityName,
    entityType: entityType as PointsExplanationData["entityType"],
    entityImage,
    totalPoints,
    metrics,
    bonuses: baseBonuses,
    dataTimestamp: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}


