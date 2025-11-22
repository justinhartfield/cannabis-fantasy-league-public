import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Leaf, Package, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

interface DraftAssetCardProps {
  assetType: AssetType;
  assetId: number;
  assetName: string;
  imageUrl?: string | null;
  stats: Array<{ label: string; value: string | number }>;
  isMyTurn: boolean;
  isDrafted?: boolean;
  isInMyRoster?: boolean;
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
  onDraft,
}: DraftAssetCardProps) {
  const [imageError, setImageError] = useState(false);
  
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
      case "brand":
        return <Building2 className={cn(iconClass, "text-yellow-500")} />;
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
      case "brand":
        return "Brand";
    }
  };

  // Get card styling based on state
  const getCardStyle = () => {
    if (isDrafted || isInMyRoster) {
      return "bg-muted/50 border-muted opacity-60";
    }
    
    if (!isMyTurn) {
      return "bg-card border-border hover:bg-accent/30";
    }

    return "bg-card border-border hover:bg-accent/50";
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

    return {
      variant: "default" as const,
      text: "Draft",
      icon: null,
      disabled: false,
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all duration-300",
      getCardStyle()
    )}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Asset Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
          {imageUrl && !imageError ? (
            <img 
              src={imageUrl} 
              alt={assetName}
              className="w-10 h-10 object-contain rounded-md bg-muted"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="p-2 bg-muted rounded-lg">
              {getIcon()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-foreground truncate">{assetName}</p>
              <Badge variant="outline" className="text-xs shrink-0">
                {getCategoryLabel()}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "px-2 py-1 rounded bg-primary/10 border border-primary/20",
                    // On very small screens, only show the first two stats
                    // to give the Draft button and primary info more space.
                    idx >= 2 && "hidden md:inline-flex"
                  )}
                >
                  <span className="text-xs font-semibold text-primary">
                    {stat.label}: {stat.value}
                  </span>
                </div>
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
          className="shrink-0 w-full sm:w-auto sm:ml-4"
        >
          {buttonConfig.icon}
          {buttonConfig.text}
        </Button>
      </div>
    </div>
  );
}
