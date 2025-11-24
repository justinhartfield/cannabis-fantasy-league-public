import { Building2, Leaf, Package, UserCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

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
    brand: roster.filter((r) => r.assetType === "brand").length,
  };

  const totalPicks = roster.length;
  const maxPicks = 10; // Updated to 10 for Flex slot
  const progress = Math.min(100, (totalPicks / maxPicks) * 100);

  // Get icon for asset type
  const getIcon = (type: AssetType | "flex") => {
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
      case "flex":
        return <UserCircle className={cn(iconClass, "text-orange-500")} />;
    }
  };

  // Position slot component
  type SlotColor = "blue" | "purple" | "pink" | "green" | "yellow" | "orange";

  const slotPalette: Record<SlotColor, { border: string; icon: string }> = {
    blue: { border: "border-blue-400/40 bg-blue-500/10", icon: "text-blue-200" },
    purple: { border: "border-purple-400/40 bg-purple-500/10", icon: "text-purple-200" },
    pink: { border: "border-pink-400/40 bg-pink-500/10", icon: "text-pink-200" },
    green: { border: "border-green-400/40 bg-green-500/10", icon: "text-green-200" },
    yellow: { border: "border-yellow-400/40 bg-yellow-500/10", icon: "text-yellow-200" },
    orange: { border: "border-orange-400/40 bg-orange-500/10", icon: "text-orange-200" },
  };

  const PositionSlot = ({
    type,
    label,
    current,
    max,
    colorClass,
    items,
  }: {
    type: AssetType | "flex";
    label: string;
    current: number;
    max: number;
    colorClass: SlotColor;
    items: RosterItem[];
  }) => {
    const isFilled = current >= max;

    return (
      <div
        className={cn(
          "p-3 rounded-2xl border transition-colors",
          slotPalette[colorClass].border,
          !isFilled && "bg-white/5 border-white/10"
        )}
      >
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="flex items-center gap-2">
            {getIcon(type)}
            <span className={cn("text-xs uppercase tracking-wide", slotPalette[colorClass].icon)}>
              {label}
            </span>
          </div>
          <span className="text-xs text-white/70">
            {current}/{max}
          </span>
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
          {Array.from({ length: Math.max(0, max - current) }).map((_, idx) => (
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

  // Identify flex items (items that exceed the category limit)
  const getCategoryItems = (type: AssetType, limit: number) => {
    return roster.filter(r => r.assetType === type).slice(0, limit);
  };

  const getFlexItems = () => {
    const flexItems: RosterItem[] = [];

    const mfg = roster.filter(r => r.assetType === "manufacturer");
    if (mfg.length > 2) flexItems.push(...mfg.slice(2));

    const strains = roster.filter(r => r.assetType === "cannabis_strain");
    if (strains.length > 2) flexItems.push(...strains.slice(2));

    const products = roster.filter(r => r.assetType === "product");
    if (products.length > 2) flexItems.push(...products.slice(2));

    const pharmacies = roster.filter(r => r.assetType === "pharmacy");
    if (pharmacies.length > 2) flexItems.push(...pharmacies.slice(2));

    const brands = roster.filter(r => r.assetType === "brand");
    if (brands.length > 1) flexItems.push(...brands.slice(1));

    return flexItems;
  };

  const flexItems = getFlexItems();

  return (
    <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1a0f28] to-[#2d0f3f] p-5 text-white shadow-[0_20px_40px_rgba(10,6,25,0.55)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <UserCircle className="w-5 h-5" />
          {teamName}
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-white/60">
          {totalPicks}/{maxPicks} Picks
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm text-white/70 mb-2">
          <span>Roster Progress</span>
          <span className="font-semibold text-white">{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#cfff4d] via-[#8df6a2] to-[#6be1ff] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <PositionSlot
          type="manufacturer"
          label="Hersteller"
          current={Math.min(2, counts.manufacturer)}
          max={2}
          colorClass="blue"
          items={getCategoryItems("manufacturer", 2)}
        />
        <PositionSlot
          type="cannabis_strain"
          label="Strains"
          current={Math.min(2, counts.cannabis_strain)}
          max={2}
          colorClass="purple"
          items={getCategoryItems("cannabis_strain", 2)}
        />
        <PositionSlot
          type="product"
          label="Produkte"
          current={Math.min(2, counts.product)}
          max={2}
          colorClass="pink"
          items={getCategoryItems("product", 2)}
        />
        <PositionSlot
          type="pharmacy"
          label="Apotheken"
          current={Math.min(2, counts.pharmacy)}
          max={2}
          colorClass="green"
          items={getCategoryItems("pharmacy", 2)}
        />
        <PositionSlot
          type="brand"
          label="Brands"
          current={Math.min(1, counts.brand)}
          max={1}
          colorClass="yellow"
          items={getCategoryItems("brand", 1)}
        />
        <PositionSlot
          type="flex"
          label="Flex Slot"
          current={flexItems.length}
          max={1}
          colorClass="orange"
          items={flexItems}
        />
      </div>

      {totalPicks >= maxPicks && (
        <div className="mt-4 rounded-2xl border border-green-400/40 bg-green-500/15 p-3 text-center text-sm font-semibold text-green-200">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
          Roster Complete!
        </div>
      )}
    </div>
  );
}
