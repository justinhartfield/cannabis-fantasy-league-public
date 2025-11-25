import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Leaf, Package, Building2, UserCircle, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { DraftAssetCard } from "@/components/DraftAssetCard";
import { cn } from "@/lib/utils";

export type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

type DailyScoreFields = {
  todayPoints?: number | null;
  yesterdayPoints?: number | null;
  todayStatDate?: string | null;
  yesterdayStatDate?: string | null;
};

const formatDailyPoints = (points?: number | null) =>
  points === null || points === undefined ? "—" : `${points} pts`;

const formatStatDateLabel = (label: string, statDate?: string | null) => {
  if (!statDate) return label;
  const parsed = new Date(statDate);
  if (Number.isNaN(parsed.getTime())) {
    return label;
  }
  return `${label} (${parsed.toLocaleDateString()})`;
};

const buildDailyScoreStats = (entity?: DailyScoreFields) => {
  if (!entity) return [];
  return [
    {
      label: formatStatDateLabel("Today", entity.todayStatDate),
      value: formatDailyPoints(entity.todayPoints),
    },
    {
      label: formatStatDateLabel("Yesterday", entity.yesterdayStatDate),
      value: formatDailyPoints(entity.yesterdayPoints),
    },
  ];
};

interface DraftBoardProps {
  leagueId: number;
  currentPick: number;
  isMyTurn: boolean;
  myRoster: Array<{ assetType: AssetType; assetId: number; name: string }>;
  onDraftPick: (assetType: AssetType, assetId: number) => void;
  draftedAssets?: Record<AssetType, Set<number>>;
}

/**
 * DraftBoard Component
 * 
 * Displays available assets for drafting with the new 10-player roster structure:
 * - 2 Manufacturers
 * - 2 Cannabis Strains (genetics/cultivars)
 * - 2 Products (pharmaceutical products)
 * - 2 Pharmacies
 * - 1 Brand
 * - 1 Flex (any category)
 */
export default function DraftBoard({
  leagueId,
  currentPick,
  isMyTurn,
  myRoster,
  onDraftPick,
  draftedAssets,
}: DraftBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AssetType | "all" | "brand">("all");
  const [sortBy, setSortBy] = useState<"name" | "stats">("stats");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch available players from backend
  const { data: manufacturers = [], isLoading: loadingMfg } = trpc.draft.getAvailableManufacturers.useQuery({
    leagueId,
    search: searchQuery,
    limit: 200,
  }, { enabled: selectedCategory === "all" || selectedCategory === "manufacturer" });

  const { data: cannabisStrains = [], isLoading: loadingStrains } = trpc.draft.getAvailableCannabisStrains.useQuery({
    leagueId,
    search: searchQuery,
    limit: 200,
  }, { enabled: selectedCategory === "all" || selectedCategory === "cannabis_strain" });

  const { data: products = [], isLoading: loadingProducts } = trpc.draft.getAvailableProducts.useQuery({
    leagueId,
    search: searchQuery,
    limit: 200,
  }, { enabled: selectedCategory === "all" || selectedCategory === "product" });

  const { data: pharmacies = [], isLoading: loadingPharmacies } = trpc.draft.getAvailablePharmacies.useQuery({
    leagueId,
    search: searchQuery,
    limit: 200,
  }, { enabled: selectedCategory === "all" || selectedCategory === "pharmacy" });

  const { data: brands = [], isLoading: loadingBrands } = trpc.draft.getAvailableBrands.useQuery({
    leagueId,
    search: searchQuery,
    limit: 200,
  }, { enabled: selectedCategory === "all" || selectedCategory === "brand" });

  const isLoading = loadingMfg || loadingStrains || loadingProducts || loadingPharmacies || loadingBrands;

  // Calculate roster needs
  const rosterCounts = {
    manufacturer: myRoster.filter((r) => r.assetType === "manufacturer").length,
    cannabis_strain: myRoster.filter((r) => r.assetType === "cannabis_strain").length,
    product: myRoster.filter((r) => r.assetType === "product").length,
    pharmacy: myRoster.filter((r) => r.assetType === "pharmacy").length,
    brand: myRoster.filter((r) => r.assetType === "brand").length,
  };

  const rosterNeeds = {
    manufacturer: Math.max(0, 2 - rosterCounts.manufacturer),
    cannabis_strain: Math.max(0, 2 - rosterCounts.cannabis_strain),
    product: Math.max(0, 2 - rosterCounts.product),
    pharmacy: Math.max(0, 2 - rosterCounts.pharmacy),
    brand: Math.max(0, 1 - rosterCounts.brand),
    flex: Math.max(0, 1 - (myRoster.length - (rosterCounts.manufacturer + rosterCounts.cannabis_strain + rosterCounts.product + rosterCounts.pharmacy + rosterCounts.brand))),
  };

  // Hard limits per position type - max 2 of each (prevents over-drafting even with flex)
  const positionLimits = {
    manufacturer: 2,
    cannabis_strain: 2,
    product: 2,
    pharmacy: 2,
    brand: 2,
  };

  // Check if a position type has reached its max limit
  const isPositionFull = (assetType: AssetType): boolean => {
    return rosterCounts[assetType] >= positionLimits[assetType];
  };

  // Sorting helper function
  const sortAssets = <T extends { name: string; yesterdayPoints?: number | null; todayPoints?: number | null }>(assets: T[]): T[] => {
    const sorted = [...assets].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        // Sort by yesterday's points (default), use today's points as fallback
        const aValue = a.yesterdayPoints ?? a.todayPoints ?? 0;
        const bValue = b.yesterdayPoints ?? b.todayPoints ?? 0;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
    });
    return sorted;
  };

  const isAssetDrafted = (assetType: AssetType, assetId: number) => {
    if (!draftedAssets) return false;
    const set = draftedAssets[assetType];
    return set?.has(assetId) ?? false;
  };

  const filterDraftedAssets = <T extends { id: number }>(assets: T[], assetType: AssetType) => {
    if (!draftedAssets) return assets;
    const draftedSet = draftedAssets[assetType];
    if (!draftedSet || draftedSet.size === 0) return assets;
    return assets.filter((asset) => !draftedSet.has(asset.id));
  };

  const handleDraft = (assetType: AssetType, assetId: number, assetName: string) => {
    if (!isMyTurn) {
      toast.error("Nicht dein Zug!");
      return;
    }

    // Check if position limit is reached (max 2 of each type)
    if (isPositionFull(assetType)) {
      const positionLabel = assetType === 'manufacturer' ? 'Hersteller' :
                           assetType === 'cannabis_strain' ? 'Strains' :
                           assetType === 'product' ? 'Produkte' :
                           assetType === 'pharmacy' ? 'Apotheken' : 'Brands';
      toast.error(`Du hast bereits 2 ${positionLabel}. Maximum erreicht!`);
      return;
    }

    onDraftPick(assetType, assetId);
    toast.success(`${assetName} gedraftet!`);
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <div className="space-y-6">
      {/* Draft Status */}
      <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#2c1140] via-[#1c0f2a] to-[#14091f] p-6 text-white shadow-[0_25px_60px_rgba(10,5,20,0.6)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Pick #{currentPick}</p>
            <h2 className="text-2xl font-semibold">Draft Board</h2>
            <p className="text-sm text-white/70">Fülle jede Kategorie, um dein Team zu komplettieren.</p>
          </div>
          {isMyTurn && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#cfff4d] px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(207,255,77,0.4)]">
              Dein Zug!
            </span>
          )}
        </div>

        {/* Roster Needs */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-2 text-blue-300" />
            <p className="text-[11px] uppercase tracking-wide text-white/60">Hersteller</p>
            <p className="text-xl font-bold">{rosterCounts.manufacturer}/2</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <Leaf className="w-5 h-5 mx-auto mb-2 text-purple-300" />
            <p className="text-[11px] uppercase tracking-wide text-white/60">Strains</p>
            <p className="text-xl font-bold">{rosterCounts.cannabis_strain}/2</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <Package className="w-5 h-5 mx-auto mb-2 text-pink-300" />
            <p className="text-[11px] uppercase tracking-wide text-white/60">Produkte</p>
            <p className="text-xl font-bold">{rosterCounts.product}/2</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-2 text-green-300" />
            <p className="text-[11px] uppercase tracking-wide text-white/60">Apotheken</p>
            <p className="text-xl font-bold">{rosterCounts.pharmacy}/2</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-2 text-yellow-200" />
            <p className="text-[11px] uppercase tracking-wide text-white/60">Brands</p>
            <p className="text-xl font-bold">{rosterCounts.brand}/1</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <UserCircle className="w-5 h-5 mx-auto mb-2 text-orange-200" />
            <p className="text-[11px] uppercase tracking-wide text-white/60">Flex</p>
            <p className="text-xl font-bold">
              {Math.max(
                0,
                myRoster.length -
                  (rosterCounts.manufacturer +
                    rosterCounts.cannabis_strain +
                    rosterCounts.product +
                    rosterCounts.pharmacy +
                    rosterCounts.brand)
              )}
              /1
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Spieler oder Brand suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-[#cfff4d]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSortBy("name")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition",
                sortBy === "name" ? "bg-[#cfff4d] text-black" : "bg-white/10 text-white/70"
              )}
            >
              Nach Name
            </button>
            <button
              onClick={() => setSortBy("stats")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition",
                sortBy === "stats" ? "bg-[#cfff4d] text-black" : "bg-white/10 text-white/70"
              )}
            >
              Nach Stats
            </button>
            <button
              onClick={toggleSort}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-white/10 text-white/70 flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
            </button>
          </div>
        </div>
      </div>

      {/* Available Assets */}
      <Card className="rounded-[32px] border-0 bg-white/90 shadow-[0_20px_50px_rgba(137,110,196,0.18)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-[#2c1941]">Verfügbare Spieler</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
            <TabsList className="w-full inline-flex overflow-x-auto rounded-full bg-[#f2e9ff] p-1 gap-2">
              <TabsTrigger value="all" className="flex-shrink-0 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2c1941]">
                Alle
              </TabsTrigger>
              <TabsTrigger value="manufacturer" className="flex-shrink-0 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2c1941]">Hersteller</TabsTrigger>
              <TabsTrigger value="cannabis_strain" className="flex-shrink-0 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2c1941]">Strains</TabsTrigger>
              <TabsTrigger value="product" className="flex-shrink-0 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2c1941]">Produkte</TabsTrigger>
              <TabsTrigger value="pharmacy" className="flex-shrink-0 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2c1941]">Apotheken</TabsTrigger>
              <TabsTrigger value="brand" className="flex-shrink-0 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2c1941]">Brands</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-6">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Lädt...</p>
              ) : (
                <>
                  {/* Manufacturers */}
                  {manufacturers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Hersteller ({manufacturers.length})
                      </h4>
                      {filterDraftedAssets(sortAssets(manufacturers), "manufacturer")
                        .slice(0, 10)
                        .map((mfg) => (
                        <DraftAssetCard
                          key={`mfg-${mfg.id}`}
                          assetType="manufacturer"
                          assetId={mfg.id}
                          assetName={mfg.name}
                          imageUrl={mfg.logoUrl}
                          stats={[
                            ...buildDailyScoreStats(mfg),
                            { label: "Produkte", value: mfg.productCount },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={
                            myRoster.some((r) => r.assetType === "manufacturer" && r.assetId === mfg.id) ||
                            isAssetDrafted("manufacturer", mfg.id)
                          }
                          isPositionFull={isPositionFull("manufacturer")}
                          onDraft={handleDraft}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Cannabis Strains */}
                  {cannabisStrains.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Leaf className="w-4 h-4" /> Strains ({cannabisStrains.length})
                      </h4>
                      {filterDraftedAssets(sortAssets(cannabisStrains), "cannabis_strain")
                        .slice(0, 10)
                        .map((strain) => (
                        <DraftAssetCard
                          key={`strain-${strain.id}`}
                          assetType="cannabis_strain"
                          assetId={strain.id}
                          assetName={strain.name}
                          imageUrl={strain.imageUrl}
                          stats={[
                            ...buildDailyScoreStats(strain),
                            { label: "Typ", value: strain.type },
                            { label: "Effects", value: Array.isArray(strain.effects) ? strain.effects.slice(0, 2).join(", ") : (strain.effects || "N/A") },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={
                            myRoster.some((r) => r.assetType === "cannabis_strain" && r.assetId === strain.id) ||
                            isAssetDrafted("cannabis_strain", strain.id)
                          }
                          isPositionFull={isPositionFull("cannabis_strain")}
                          onDraft={handleDraft}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Products */}
                  {products.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Package className="w-4 h-4" /> Produkte ({products.length})
                      </h4>
                      {filterDraftedAssets(sortAssets(products), "product")
                        .slice(0, 10)
                        .map((product) => (
                        <DraftAssetCard
                          key={`product-${product.id}`}
                          assetType="product"
                          assetId={product.id}
                          assetName={product.name}
                          imageUrl={product.imageUrl}
                          stats={[
                            ...buildDailyScoreStats(product),
                            { label: "Hersteller", value: product.manufacturer },
                            { label: "THC", value: `${product.thcContent}%` },
                            { label: "Favorites", value: product.favoriteCount },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={
                            myRoster.some((r) => r.assetType === "product" && r.assetId === product.id) ||
                            isAssetDrafted("product", product.id)
                          }
                          isPositionFull={isPositionFull("product")}
                          onDraft={handleDraft}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Brands */}
                  {brands.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Brands ({brands.length})
                      </h4>
                      {filterDraftedAssets(sortAssets(brands), "brand")
                        .slice(0, 10)
                        .map((brand) => (
                        <DraftAssetCard
                          key={`brand-${brand.id}`}
                          assetType="brand"
                          assetId={brand.id}
                          assetName={brand.name}
                          imageUrl={brand.logoUrl}
                          stats={[
                            ...buildDailyScoreStats(brand),
                            { label: "Favorites", value: brand.totalFavorites || 0 },
                            { label: "Views", value: brand.totalViews || 0 },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={
                            myRoster.some((r) => r.assetType === "brand" && r.assetId === brand.id) ||
                            isAssetDrafted("brand", brand.id)
                          }
                          isPositionFull={isPositionFull("brand")}
                          onDraft={handleDraft}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Pharmacies */}
                  {pharmacies.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Apotheken ({pharmacies.length})
                      </h4>
                      {filterDraftedAssets(sortAssets(pharmacies), "pharmacy")
                        .slice(0, 10)
                        .map((phm) => (
                        <DraftAssetCard
                          key={`pharmacy-${phm.id}`}
                          assetType="pharmacy"
                          assetId={phm.id}
                          assetName={phm.name}
                          imageUrl={phm.logoUrl}
                          stats={[
                            ...buildDailyScoreStats(phm),
                            { label: "Stadt", value: phm.city },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={
                            myRoster.some((r) => r.assetType === "pharmacy" && r.assetId === phm.id) ||
                            isAssetDrafted("pharmacy", phm.id)
                          }
                          isPositionFull={isPositionFull("pharmacy")}
                          onDraft={handleDraft}
                        />
                      ))}
                    </div>
                  )}
                  
                  {manufacturers.length === 0 && cannabisStrains.length === 0 && products.length === 0 && pharmacies.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Keine Spieler gefunden
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="manufacturer" className="space-y-2 mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Lädt...</p>
              ) : manufacturers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Hersteller gefunden</p>
              ) : (
                filterDraftedAssets(sortAssets(manufacturers), "manufacturer").map((mfg) => (
                  <DraftAssetCard
                    key={mfg.id}
                    assetType="manufacturer"
                    assetId={mfg.id}
                    assetName={mfg.name}
                    imageUrl={mfg.logoUrl}
                    stats={[
                      ...buildDailyScoreStats(mfg),
                      { label: "Produkte", value: mfg.productCount },
                    ]}
                    isMyTurn={isMyTurn}
                    isInMyRoster={
                      myRoster.some((r) => r.assetType === "manufacturer" && r.assetId === mfg.id) ||
                      isAssetDrafted("manufacturer", mfg.id)
                    }
                    isPositionFull={isPositionFull("manufacturer")}
                    onDraft={handleDraft}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="cannabis_strain" className="space-y-2 mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Lädt...</p>
              ) : cannabisStrains.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Strains gefunden</p>
              ) : (
                filterDraftedAssets(sortAssets(cannabisStrains), "cannabis_strain").map((strain) => (
                <DraftAssetCard
                  key={strain.id}
                  assetType="cannabis_strain"
                  assetId={strain.id}
                  assetName={strain.name}
                  imageUrl={strain.imageUrl}
                  stats={[
                    ...buildDailyScoreStats(strain),
                    { label: "Typ", value: strain.type },
                    { label: "Effects", value: Array.isArray(strain.effects) ? strain.effects.slice(0, 2).join(", ") : (strain.effects || "N/A") },
                  ]}
                  isMyTurn={isMyTurn}
                  isInMyRoster={
                    myRoster.some((r) => r.assetType === "cannabis_strain" && r.assetId === strain.id) ||
                    isAssetDrafted("cannabis_strain", strain.id)
                  }
                  isPositionFull={isPositionFull("cannabis_strain")}
                  onDraft={handleDraft}
                />
                ))
              )}
            </TabsContent>

            <TabsContent value="product" className="space-y-2 mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Lädt...</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Produkte gefunden</p>
              ) : (
                filterDraftedAssets(sortAssets(products), "product").map((product) => (
                  <DraftAssetCard
                    key={product.id}
                    assetType="product"
                    assetId={product.id}
                    assetName={product.name}
                    imageUrl={product.imageUrl}
                    stats={[
                      ...buildDailyScoreStats(product),
                      { label: "Hersteller", value: product.manufacturer },
                      { label: "THC", value: `${product.thcContent}%` },
                      { label: "Favorites", value: product.favoriteCount },
                    ]}
                    isMyTurn={isMyTurn}
                    isInMyRoster={
                      myRoster.some((r) => r.assetType === "product" && r.assetId === product.id) ||
                      isAssetDrafted("product", product.id)
                    }
                    isPositionFull={isPositionFull("product")}
                    onDraft={handleDraft}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pharmacy" className="space-y-2 mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Lädt...</p>
              ) : pharmacies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Apotheken gefunden</p>
              ) : (
                filterDraftedAssets(sortAssets(pharmacies), "pharmacy").map((phm) => (
                  <DraftAssetCard
                    key={phm.id}
                    assetType="pharmacy"
                    assetId={phm.id}
                    assetName={phm.name}
                    imageUrl={phm.logoUrl}
                    stats={[
                      ...buildDailyScoreStats(phm),
                      { label: "Stadt", value: phm.city },
                    ]}
                    isMyTurn={isMyTurn}
                    isInMyRoster={
                      myRoster.some((r) => r.assetType === "pharmacy" && r.assetId === phm.id) ||
                      isAssetDrafted("pharmacy", phm.id)
                    }
                    isPositionFull={isPositionFull("pharmacy")}
                    onDraft={handleDraft}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="brand" className="space-y-2 mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Lädt...</p>
              ) : brands.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Brands gefunden</p>
              ) : (
                filterDraftedAssets(sortAssets(brands), "brand").map((brand) => (
                  <DraftAssetCard
                    key={brand.id}
                    assetType="brand"
                    assetId={brand.id}
                    assetName={brand.name}
                    imageUrl={brand.logoUrl}
                    stats={[
                      ...buildDailyScoreStats(brand),
                      { label: "Favorites", value: brand.totalFavorites || 0 },
                      { label: "Views", value: brand.totalViews || 0 },
                    ]}
                    isMyTurn={isMyTurn}
                    isInMyRoster={
                      myRoster.some((r) => r.assetType === "brand" && r.assetId === brand.id) ||
                      isAssetDrafted("brand", brand.id)
                    }
                    isPositionFull={isPositionFull("brand")}
                    onDraft={handleDraft}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
