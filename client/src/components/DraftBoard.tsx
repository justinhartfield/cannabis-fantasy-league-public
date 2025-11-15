import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Leaf, Package, Building2, UserCircle, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { DraftAssetCard } from "@/components/DraftAssetCard";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

interface DraftBoardProps {
  leagueId: number;
  currentPick: number;
  isMyTurn: boolean;
  myRoster: Array<{ assetType: AssetType; assetId: number; name: string }>;
  remainingTime?: number | null;
  onDraftPick: (assetType: AssetType, assetId: number) => void;
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
  remainingTime,
  onDraftPick,
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

  // Sorting helper function
  const sortAssets = <T extends { name: string; productCount?: number; favoriteCount?: number }>(assets: T[]): T[] => {
    const sorted = [...assets].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        // Sort by stats (productCount for manufacturers, favoriteCount for products)
        const aValue = a.productCount || a.favoriteCount || 0;
        const bValue = b.productCount || b.favoriteCount || 0;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
    });
    return sorted;
  };

  const handleDraft = (assetType: AssetType, assetId: number, assetName: string) => {
    if (!isMyTurn) {
      toast.error("Nicht dein Zug!");
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Draft - Pick #{currentPick}</span>
            {isMyTurn && (
              <Badge variant="default" className="animate-pulse">
                Dein Zug!
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Roster Needs */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Building2 className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-muted-foreground">Hersteller</p>
              <p className="text-lg font-bold text-foreground">{rosterNeeds.manufacturer}/2</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Leaf className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-xs text-muted-foreground">Strains</p>
              <p className="text-lg font-bold text-foreground">{rosterNeeds.cannabis_strain}/2</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <Package className="w-4 h-4 mx-auto mb-1 text-pink-500" />
              <p className="text-xs text-muted-foreground">Produkte</p>
              <p className="text-lg font-bold text-foreground">{rosterNeeds.product}/2</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Building2 className="w-4 h-4 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">Apotheken</p>
              <p className="text-lg font-bold text-foreground">{rosterNeeds.pharmacy}/2</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Building2 className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
              <p className="text-xs text-muted-foreground">Brands</p>
              <p className="text-lg font-bold text-foreground">{rosterNeeds.brand || 0}/1</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <UserCircle className="w-4 h-4 mx-auto mb-1 text-orange-500" />
              <p className="text-xs text-muted-foreground">Flex</p>
              <p className="text-lg font-bold text-foreground">{rosterNeeds.flex}/1</p>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Sorting Controls */}
            <div className="flex gap-2">
              <Button
                variant={sortBy === "name" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("name")}
              >
                Nach Name
              </Button>
              <Button
                variant={sortBy === "stats" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("stats")}
              >
                Nach Stats
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSort}
              >
                <ArrowUpDown className="w-4 h-4 mr-1" />
                {sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Spieler</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="manufacturer">Hersteller</TabsTrigger>
              <TabsTrigger value="cannabis_strain">Strains</TabsTrigger>
              <TabsTrigger value="product">Produkte</TabsTrigger>
              <TabsTrigger value="pharmacy">Apotheken</TabsTrigger>
              <TabsTrigger value="brand">Brands</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-4">
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
                      {sortAssets(manufacturers).slice(0, 10).map((mfg) => (
                        <DraftAssetCard
                          key={`mfg-${mfg.id}`}
                          assetType="manufacturer"
                          assetId={mfg.id}
                          assetName={mfg.name}
                          imageUrl={mfg.logoUrl}
                          stats={[{ label: "Produkte", value: mfg.productCount }]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "manufacturer" && r.assetId === mfg.id)}
                          remainingTime={remainingTime}
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
                      {sortAssets(cannabisStrains).slice(0, 10).map((strain) => (
                        <DraftAssetCard
                          key={`strain-${strain.id}`}
                          assetType="cannabis_strain"
                          assetId={strain.id}
                          assetName={strain.name}
                          imageUrl={strain.imageUrl}
                          stats={[
                            { label: "Typ", value: strain.type },
                            { label: "Effects", value: Array.isArray(strain.effects) ? strain.effects.slice(0, 2).join(", ") : (strain.effects || "N/A") },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "cannabis_strain" && r.assetId === strain.id)}
                          remainingTime={remainingTime}
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
                      {sortAssets(products).slice(0, 10).map((product) => (
                        <DraftAssetCard
                          key={`product-${product.id}`}
                          assetType="product"
                          assetId={product.id}
                          assetName={product.name}
                          stats={[
                            { label: "Hersteller", value: product.manufacturer },
                            { label: "THC", value: `${product.thcContent}%` },
                            { label: "Favorites", value: product.favoriteCount },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "product" && r.assetId === product.id)}
                          remainingTime={remainingTime}
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
                      {sortAssets(brands).slice(0, 10).map((brand) => (
                        <DraftAssetCard
                          key={`brand-${brand.id}`}
                          assetType="brand"
                          assetId={brand.id}
                          assetName={brand.name}
                          imageUrl={brand.logoUrl}
                          stats={[
                            { label: "Favorites", value: brand.totalFavorites || 0 },
                            { label: "Views", value: brand.totalViews || 0 },
                          ]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "brand" && r.assetId === brand.id)}
                          remainingTime={remainingTime}
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
                      {sortAssets(pharmacies).slice(0, 10).map((phm) => (
                        <DraftAssetCard
                          key={`pharmacy-${phm.id}`}
                          assetType="pharmacy"
                          assetId={phm.id}
                          assetName={phm.name}
                          imageUrl={phm.logoUrl}
                          stats={[{ label: "Stadt", value: phm.city }]}
                          isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "pharmacy" && r.assetId === phm.id)}
                          remainingTime={remainingTime}
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
                sortAssets(manufacturers).map((mfg) => (
                  <DraftAssetCard
                    key={mfg.id}
                    assetType="manufacturer"
                    assetId={mfg.id}
                    assetName={mfg.name}
                    stats={[{ label: "Produkte", value: mfg.productCount }]}
                    isMyTurn={isMyTurn}
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
                sortAssets(cannabisStrains).map((strain) => (
                <DraftAssetCard
                  key={strain.id}
                  assetType="cannabis_strain"
                  assetId={strain.id}
                  assetName={strain.name}
                  stats={[
                    { label: "Typ", value: strain.type },
                    { label: "Effects", value: Array.isArray(strain.effects) ? strain.effects.slice(0, 2).join(", ") : (strain.effects || "N/A") },
                  ]}
                  isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "cannabis_strain" && r.assetId === strain.id)}
                          remainingTime={remainingTime}
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
                sortAssets(products).map((product) => (
                  <DraftAssetCard
                    key={product.id}
                    assetType="product"
                    assetId={product.id}
                    assetName={product.name}
                    stats={[
                      { label: "Hersteller", value: product.manufacturer },
                      { label: "THC", value: `${product.thcContent}%` },
                      { label: "Favorites", value: product.favoriteCount },
                    ]}
                    isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "product" && r.assetId === product.id)}
                          remainingTime={remainingTime}
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
                sortAssets(pharmacies).map((phm) => (
                  <DraftAssetCard
                    key={phm.id}
                    assetType="pharmacy"
                    assetId={phm.id}
                    assetName={phm.name}
                    stats={[{ label: "Stadt", value: phm.city }]}
                    isMyTurn={isMyTurn}
                          isInMyRoster={myRoster.some(r => r.assetType === "pharmacy" && r.assetId === phm.id)}
                          remainingTime={remainingTime}
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
                sortAssets(brands).map((brand) => (
                  <DraftAssetCard
                    key={brand.id}
                    assetType="brand"
                    assetId={brand.id}
                    assetName={brand.name}
                    stats={[
                      { label: "Favorites", value: brand.totalFavorites || 0 },
                      { label: "Views", value: brand.totalViews || 0 },
                    ]}
                    isMyTurn={isMyTurn}
                    isInMyRoster={myRoster.some(r => r.assetType === "brand" && r.assetId === brand.id)}
                    remainingTime={remainingTime}
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

/**
 * DraftAssetCard Component
 * Individual draft card for an asset
 */
function DraftAssetCard({
  assetType,
  assetId,
  assetName,
  stats,
  isMyTurn,
  onDraft,
}: {
  assetType: AssetType;
  assetId: number;
  assetName: string;
  stats: Array<{ label: string; value: string | number }>;
  isMyTurn: boolean;
  onDraft: (assetType: AssetType, assetId: number, assetName: string) => void;
}) {
  const getIcon = () => {
    switch (assetType) {
      case "manufacturer":
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case "cannabis_strain":
        return <Leaf className="w-5 h-5 text-purple-500" />;
      case "product":
        return <Package className="w-5 h-5 text-pink-500" />;
      case "pharmacy":
        return <Building2 className="w-5 h-5 text-green-500" />;
      case "brand":
        return <Building2 className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {getIcon()}
          <div>
            <p className="font-bold text-foreground">{assetName}</p>
            <div className="flex items-center gap-3 mt-1">
              {stats.map((stat, idx) => (
                <span key={idx} className="text-xs text-muted-foreground">
                  {stat.label}: <span className="font-medium">{stat.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onDraft(assetType, assetId, assetName)}
          disabled={!isMyTurn}
        >
          Draft
        </Button>
      </div>
    </div>
  );
}
