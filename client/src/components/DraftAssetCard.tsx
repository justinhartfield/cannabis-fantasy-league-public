import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Leaf, Package, CheckCircle2, Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { WishlistButton } from "@/components/AutoDraftBoard";

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
  isPositionFull?: boolean; // True when user has reached max picks for this position type
  onDraft: (assetType: AssetType, assetId: number, assetName: string) => void;
  leagueId?: number; // Optional: needed for wishlist functionality
  showWishlistButton?: boolean; // Optional: show wishlist add/remove button
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
  isPositionFull = false,
  onDraft,
  leagueId,
  showWishlistButton = true,
}: DraftAssetCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Validate image URL
  const isValidUrl = imageUrl && imageUrl.length > 5 && !imageUrl.includes("undefined") && !imageUrl.includes("null");
  const showImage = isValidUrl && !imageError;

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
      return "opacity-40 pointer-events-none";
    }

    if (isPositionFull) {
      return "opacity-50";
    }

    if (!isMyTurn) {
      return "opacity-80";
    }

    return "hover:border-[#cfff4d]/60";
  };

  // Get position label for error message
  const getPositionLabel = () => {
    switch (assetType) {
      case "manufacturer": return "Hersteller";
      case "cannabis_strain": return "Strains";
      case "product": return "Produkte";
      case "pharmacy": return "Apotheken";
      case "brand": return "Brands";
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

    if (isPositionFull) {
      return {
        variant: "ghost" as const,
        text: `Max ${getPositionLabel()}`,
        icon: <Lock className="w-4 h-4 mr-1" />,
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
    <div
      className={cn(
        "rounded-[26px] border border-white/10 bg-gradient-to-br from-[#2b103f] to-[#1c0c29] p-4 text-white shadow-[0_15px_35px_rgba(12,4,20,0.45)] transition",
        getCardStyle()
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showImage ? (
            <img
              src={imageUrl || ""}
              alt={assetName}
              className="w-12 h-12 object-contain rounded-2xl bg-white/10 p-1"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              {getIcon()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold truncate">{assetName}</p>
            <span className="text-xs uppercase tracking-[0.3em] text-white/60">
              {getCategoryLabel()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wishlist button */}
          {showWishlistButton && leagueId && !isDrafted && !isInMyRoster && (
            <WishlistButton
              leagueId={leagueId}
              assetType={assetType}
              assetId={assetId}
              assetName={assetName}
            />
          )}

          {/* Draft button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDraft(assetType, assetId, assetName)}
            disabled={buttonConfig.disabled}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition shadow-[0_10px_25px_rgba(207,255,77,0.35)]",
              buttonConfig.disabled
                ? "bg-white/10 text-white/40 cursor-not-allowed shadow-none"
                : "bg-[#cfff4d] text-black hover:bg-[#b7f237]"
            )}
          >
            {buttonConfig.icon}
            {buttonConfig.text}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {stats.map((stat, idx) => (
          <div
            key={`${stat.label}-${idx}`}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
          >
            {stat.label}: {stat.value}
          </div>
        ))}
      </div>
    </div>
  );
}
