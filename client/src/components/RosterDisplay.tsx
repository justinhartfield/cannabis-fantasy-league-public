import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Leaf, 
  Package, 
  Building, 
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy";

interface RosterAsset {
  id: number;
  assetType: AssetType;
  assetId: number;
  assetName: string;
  acquiredWeek: number;
  acquiredVia: "draft" | "waiver" | "trade" | "free_agent";
  // Performance metrics
  weeklyPoints?: number;
  seasonPoints?: number;
  trend?: "up" | "down" | "stable";
}

interface RosterDisplayProps {
  teamId: number;
  roster: RosterAsset[];
  onManageRoster?: () => void;
}

/**
 * RosterDisplay Component
 * 
 * Shows team roster organized by position with the 9-player structure:
 * - 2 Manufacturers
 * - 2 Cannabis Strains
 * - 2 Products
 * - 2 Pharmacies
 * - 1 Flex
 */
export default function RosterDisplay({
  teamId,
  roster: initialRoster,
  onManageRoster,
}: RosterDisplayProps) {
  // Fetch roster from backend
  const { data: rosterData, isLoading } = trpc.roster.getTeamRoster.useQuery({ teamId });
  const { data: rosterNeeds } = trpc.roster.getRosterNeeds.useQuery({ teamId });

  // Use backend data if available, otherwise use props
  const roster = rosterData || initialRoster;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Roster wird geladen...</p>
        </CardContent>
      </Card>
    );
  }
  // Group roster by asset type
  const manufacturers = roster.filter((a) => a.assetType === "manufacturer");
  const cannabisStrains = roster.filter((a) => a.assetType === "cannabis_strain");
  const products = roster.filter((a) => a.assetType === "product");
  const pharmacies = roster.filter((a) => a.assetType === "pharmacy");

  const getAssetTypeLabel = (type: AssetType) => {
    switch (type) {
      case "manufacturer":
        return "Hersteller";
      case "cannabis_strain":
        return "Cannabis Strain";
      case "product":
        return "Produkt";
      case "pharmacy":
        return "Apotheke";
    }
  };

  const getAcquiredViaLabel = (via: string) => {
    switch (via) {
      case "draft":
        return "Draft";
      case "waiver":
        return "Waiver";
      case "trade":
        return "Trade";
      case "free_agent":
        return "Free Agent";
      default:
        return via;
    }
  };

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mein Roster</CardTitle>
            {onManageRoster && (
              <Button variant="outline" size="sm" onClick={onManageRoster}>
                Roster verwalten
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{manufacturers.length}/2</p>
              <p className="text-sm text-muted-foreground">Hersteller</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{cannabisStrains.length}/2</p>
              <p className="text-sm text-muted-foreground">Strains</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{products.length}/2</p>
              <p className="text-sm text-muted-foreground">Produkte</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pharmacies.length}/2</p>
              <p className="text-sm text-muted-foreground">Apotheken</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manufacturers */}
      {manufacturers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Hersteller ({manufacturers.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {manufacturers.map((asset) => (
              <RosterAssetCard key={asset.id} asset={asset} getAssetTypeLabel={getAssetTypeLabel} getAcquiredViaLabel={getAcquiredViaLabel} getTrendIcon={getTrendIcon} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cannabis Strains */}
      {cannabisStrains.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="w-5 h-5 text-purple-500" />
              Cannabis Strains ({cannabisStrains.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cannabisStrains.map((asset) => (
              <RosterAssetCard key={asset.id} asset={asset} getAssetTypeLabel={getAssetTypeLabel} getAcquiredViaLabel={getAcquiredViaLabel} getTrendIcon={getTrendIcon} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Products */}
      {products.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-pink-500" />
              Produkte ({products.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {products.map((asset) => (
              <RosterAssetCard key={asset.id} asset={asset} getAssetTypeLabel={getAssetTypeLabel} getAcquiredViaLabel={getAcquiredViaLabel} getTrendIcon={getTrendIcon} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pharmacies */}
      {pharmacies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-green-500" />
              Apotheken ({pharmacies.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pharmacies.map((asset) => (
              <RosterAssetCard key={asset.id} asset={asset} getAssetTypeLabel={getAssetTypeLabel} getAcquiredViaLabel={getAcquiredViaLabel} getTrendIcon={getTrendIcon} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {roster.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Noch keine Spieler im Roster</p>
            <p className="text-sm text-muted-foreground mt-2">
              Füge Spieler über den Draft oder Waivers hinzu
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * RosterAssetCard Component
 * Individual roster asset display
 */
function RosterAssetCard({
  asset,
  getAssetTypeLabel,
  getAcquiredViaLabel,
  getTrendIcon,
}: {
  asset: RosterAsset;
  getAssetTypeLabel: (type: AssetType) => string;
  getAcquiredViaLabel: (via: string) => string;
  getTrendIcon: (trend?: "up" | "down" | "stable") => React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-foreground">{asset.assetName}</p>
            {asset.trend && getTrendIcon(asset.trend)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {getAssetTypeLabel(asset.assetType)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getAcquiredViaLabel(asset.acquiredVia)} - W{asset.acquiredWeek}
            </Badge>
          </div>
        </div>
        {(asset.weeklyPoints !== undefined || asset.seasonPoints !== undefined) && (
          <div className="text-right ml-4">
            {asset.weeklyPoints !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Diese Woche</p>
                <p className="text-lg font-bold text-foreground">{asset.weeklyPoints}</p>
              </div>
            )}
            {asset.seasonPoints !== undefined && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">Saison</p>
                <p className="text-sm font-medium text-muted-foreground">{asset.seasonPoints}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
