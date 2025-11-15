import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Leaf, Package, UserCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy";

interface RosterItem {
  assetType: AssetType;
  assetId: number;
  name: string;
  imageUrl?: string | null;
}

interface MyRosterProps {
  roster: RosterItem[];
  teamName: string;
}

/**
 * MyRoster Component
 * 
 * Displays the current team's drafted roster with:
 * - Position-by-position breakdown
 * - Visual indicators for filled/empty slots
 * - Progress tracking (X/9 players)
 * - Category icons and colors
 */
export function MyRoster({ roster, teamName }: MyRosterProps) {
  // Calculate roster counts
  const counts = {
    manufacturer: roster.filter((r) => r.assetType === "manufacturer").length,
    cannabis_strain: roster.filter((r) => r.assetType === "cannabis_strain").length,
    product: roster.filter((r) => r.assetType === "product").length,
    pharmacy: roster.filter((r) => r.assetType === "pharmacy").length,
  };

  const totalPicks = roster.length;
  const maxPicks = 9;
  const progress = (totalPicks / maxPicks) * 100;

  // Get icon for asset type
  const getIcon = (type: AssetType) => {
    const iconClass = "w-4 h-4";
    switch (type) {
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
  const getCategoryLabel = (type: AssetType) => {
    switch (type) {
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

  // Position slot component
  const PositionSlot = ({ 
    type, 
    label, 
    current, 
    max, 
    colorClass 
  }: { 
    type: AssetType; 
    label: string; 
    current: number; 
    max: number; 
    colorClass: string;
  }) => {
    const items = roster.filter((r) => r.assetType === type);
    const isFilled = current >= max;

    return (
      <div className={cn(
        "p-3 rounded-lg border transition-colors",
        isFilled 
          ? `bg-${colorClass}-50 dark:bg-${colorClass}-950/20 border-${colorClass}-500/50`
          : "bg-muted/30 border-border"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getIcon(type)}
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          <Badge 
            variant={isFilled ? "default" : "outline"}
            className="text-xs"
          >
            {current}/{max}
          </Badge>
        </div>
        
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div 
              key={`${item.assetId}-${idx}`}
              className="flex items-center gap-2 text-xs"
            >
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-5 h-5 object-contain rounded"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              )}
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
          ))}
          {Array.from({ length: max - current }).map((_, idx) => (
            <div 
              key={`empty-${idx}`}
              className="flex items-center gap-2 text-xs text-muted-foreground/50"
            >
              <div className="w-3 h-3 rounded-full border border-dashed border-muted-foreground/30 shrink-0" />
              <span className="italic">Empty slot</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <UserCircle className="w-5 h-5" />
            {teamName}
          </span>
          <Badge variant="outline">
            {totalPicks}/{maxPicks} Picks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Roster Progress</span>
            <span className="font-medium text-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Position Slots */}
        <div className="space-y-3">
          <PositionSlot
            type="manufacturer"
            label="Hersteller"
            current={counts.manufacturer}
            max={2}
            colorClass="blue"
          />
          <PositionSlot
            type="cannabis_strain"
            label="Strains"
            current={counts.cannabis_strain}
            max={2}
            colorClass="purple"
          />
          <PositionSlot
            type="product"
            label="Produkte"
            current={counts.product}
            max={2}
            colorClass="pink"
          />
          <PositionSlot
            type="pharmacy"
            label="Apotheken"
            current={counts.pharmacy}
            max={2}
            colorClass="green"
          />
          <PositionSlot
            type="brand"
            label="Brands"
            current={counts.brand}
            max={1}
            colorClass="yellow"
          />
        </div>

        {/* Flex Slot */}
        <div className="p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-500/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-foreground">Flex</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {Math.max(0, totalPicks - 9)}/1
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Any category (10th pick)
          </p>
        </div>

        {/* Draft Status */}
        {totalPicks === maxPicks && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-500 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Roster Complete!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
