import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Leaf, Package, Clock, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy";

interface DraftAssetCardProps {
  assetType: AssetType;
  assetId: number;
  assetName: string;
  imageUrl?: string | null;
  stats: Array<{ label: string; value: string | number }>;
  isMyTurn: boolean;
  isDrafted?: boolean;
  isInMyRoster?: boolean;
  remainingTime?: number | null;
  onDraft: (assetType: AssetType, assetId: number, assetName: string) => void;
}

/**
 * Enhanced DraftAssetCard Component
 * 
 * Individual draft card with:
 * - Timer awareness (urgency indicators)
 * - Draft button states (enabled/disabled/drafted)
 * - Visual feedback for turn status
 * - Roster status indicators
 */
export function DraftAssetCard({
  assetType,
  assetId,
  assetName,
  imageUrl,
  stats,
  isMyTurn,
  isDrafted = false,
  isInMyRoster = false,
  remainingTime,
  onDraft,
}: DraftAssetCardProps) {
  
  // Get icon based on asset type
  const getIcon = () => {
    const iconClass = "w-5 h-5";
    switch (assetType) {
      case "manufacturer":
        return <Building2 className={cn(iconClass, "text-blue-500")} />;
      case "cannabis_strain":
        return <Leaf className={cn(iconClass, "text-purple-500")} />;
      case "product":
        return <Package className={cn(iconClass, "text-pink-500")} />;
      case "pharmacy":
        return <Building2 className={cn(iconClass, "text-green-500")} />;
    }
  };

  // Get category label
  const getCategoryLabel = () => {
    switch (assetType) {
      case "manufacturer":
        return "Hersteller";
      case "cannabis_strain":
        return "Strain";
      case "product":
        return "Produkt";
      case "pharmacy":
        return "Apotheke";
    }
  };

  // Determine urgency level based on remaining time
  const getUrgency = () => {
    if (!isMyTurn || !remainingTime) return "none";
    if (remainingTime <= 10) return "critical";
    if (remainingTime <= 30) return "warning";
    return "normal";
  };

  const urgency = getUrgency();

  // Get card styling based on state
  const getCardStyle = () => {
    if (isDrafted || isInMyRoster) {
      return "bg-muted/50 border-muted opacity-60";
    }
    
    if (!isMyTurn) {
      return "bg-card border-border hover:bg-accent/30";
    }

    // Active turn styling with urgency
    switch (urgency) {
      case "critical":
        return "bg-red-50 dark:bg-red-950/20 border-red-500 hover:bg-red-100 dark:hover:bg-red-950/30 shadow-lg shadow-red-500/20";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 shadow-md shadow-yellow-500/10";
      case "normal":
        return "bg-green-50 dark:bg-green-950/20 border-green-500 hover:bg-green-100 dark:hover:bg-green-950/30 shadow-md shadow-green-500/10";
      default:
        return "bg-card border-border hover:bg-accent/50";
    }
  };

  // Get button variant and text
  const getButtonConfig = () => {
    if (isDrafted) {
      return {
        variant: "ghost" as const,
        text: "Drafted",
        icon: <CheckCircle2 className="w-4 h-4 mr-1" />,
        disabled: true,
      };
    }

    if (isInMyRoster) {
      return {
        variant: "ghost" as const,
        text: "In Roster",
        icon: <CheckCircle2 className="w-4 h-4 mr-1" />,
        disabled: true,
      };
    }

    if (!isMyTurn) {
      return {
        variant: "outline" as const,
        text: "Not Your Turn",
        icon: <Lock className="w-4 h-4 mr-1" />,
        disabled: true,
      };
    }

    // Active turn - show urgency
    switch (urgency) {
      case "critical":
        return {
          variant: "destructive" as const,
          text: "Draft Now!",
          icon: <Clock className="w-4 h-4 mr-1 animate-pulse" />,
          disabled: false,
        };
      case "warning":
        return {
          variant: "default" as const,
          text: "Draft",
          icon: <Clock className="w-4 h-4 mr-1" />,
          disabled: false,
        };
      default:
        return {
          variant: "default" as const,
          text: "Draft",
          icon: null,
          disabled: false,
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all duration-300",
      getCardStyle()
    )}>
      <div className="flex items-center justify-between gap-4">
        {/* Asset Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={assetName}
              className="w-10 h-10 object-contain rounded-md"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            getIcon()
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-foreground truncate">{assetName}</p>
              <Badge variant="outline" className="text-xs shrink-0">
                {getCategoryLabel()}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {stats.map((stat, idx) => (
                <span key={idx} className="text-xs text-muted-foreground whitespace-nowrap">
                  {stat.label}: <span className="font-medium">{stat.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Draft Button */}
        <Button
          size="sm"
          variant={buttonConfig.variant}
          onClick={() => onDraft(assetType, assetId, assetName)}
          disabled={buttonConfig.disabled}
          className={cn(
            "shrink-0",
            urgency === "critical" && "animate-pulse"
          )}
        >
          {buttonConfig.icon}
          {buttonConfig.text}
        </Button>
      </div>

      {/* Urgency Indicator */}
      {isMyTurn && remainingTime !== null && remainingTime !== undefined && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className={cn(
              "font-medium",
              urgency === "critical" && "text-red-600 dark:text-red-400",
              urgency === "warning" && "text-yellow-600 dark:text-yellow-400",
              urgency === "normal" && "text-green-600 dark:text-green-400"
            )}>
              {urgency === "critical" && "⚠️ Time running out!"}
              {urgency === "warning" && "⏰ Make your pick soon"}
              {urgency === "normal" && "✓ Time available"}
            </span>
            <span className="text-muted-foreground">
              {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')} left
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
