import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Leaf, 
  Package, 
  Building, 
  UserCircle, 
  Lock, 
  Unlock,
  TrendingUp,
  Info
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

interface LineupSlot {
  position: string;
  assetType: AssetType;
  assetId: number | null;
  assetName: string | null;
  points?: number;
  locked: boolean;
}

interface RosterPlayer {
  assetType: AssetType;
  assetId: number;
  assetDetails: any;
}

interface LineupEditorProps {
  teamId: number;
  year: number;
  week: number;
  lineup: any;
  roster: RosterPlayer[];
  isLocked: boolean;
  onUpdateLineup: (updates: any) => void;
  onLockLineup: () => void;
}

/**
 * LineupEditor Component
 * 
 * Manages weekly lineup with 10-player roster structure:
 * - 2 Manufacturers (MFG1, MFG2)
 * - 2 Cannabis Strains (CSTR1, CSTR2)
 * - 2 Products (PRD1, PRD2)
 * - 2 Pharmacies (PHM1, PHM2)
 * - 1 Brand (BRD1)
 * - 1 Flex (FLEX - any category)
 */
export default function LineupEditor({
  teamId,
  year,
  week,
  lineup,
  roster,
  isLocked,
  onUpdateLineup,
  onLockLineup,
}: LineupEditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Use roster prop directly (already fetched by parent)
  console.log('[LineupEditor] Received roster:', roster);

  // Initialize lineup slots from lineup prop or create empty structure
  const initializeLineup = () => {
    // Check if lineup is an array (new backend format)
    if (lineup && Array.isArray(lineup)) {
      console.log('[LineupEditor] Using array format lineup:', lineup);
      return lineup.map(slot => ({
        position: slot.position,
        assetType: slot.assetType,
        assetId: slot.assetId,
        assetName: slot.assetName,
        points: slot.points || 0,
        locked: slot.locked || false,
      }));
    }
    // Check if lineup is an object with lineup array property
    if (lineup && typeof lineup === 'object' && 'lineup' in lineup && Array.isArray(lineup.lineup)) {
      console.log('[LineupEditor] Using nested lineup array:', lineup.lineup);
      return lineup.lineup.map((slot: any) => ({
        position: slot.position,
        assetType: slot.assetType,
        assetId: slot.assetId,
        assetName: slot.assetName,
        points: slot.points || 0,
        locked: slot.locked || false,
      }));
    }
    // Legacy format: flat object with position IDs
    if (lineup && typeof lineup === 'object' && 'mfg1Id' in lineup) {
      console.log('[LineupEditor] Using legacy flat object format');
      return [
        { position: 'MFG1', assetType: 'manufacturer' as AssetType, assetId: lineup.mfg1Id, assetName: null, points: 0, locked: false },
        { position: 'MFG2', assetType: 'manufacturer' as AssetType, assetId: lineup.mfg2Id, assetName: null, points: 0, locked: false },
        { position: 'CSTR1', assetType: 'cannabis_strain' as AssetType, assetId: lineup.cstr1Id, assetName: null, points: 0, locked: false },
        { position: 'CSTR2', assetType: 'cannabis_strain' as AssetType, assetId: lineup.cstr2Id, assetName: null, points: 0, locked: false },
        { position: 'PRD1', assetType: 'product' as AssetType, assetId: lineup.prd1Id, assetName: null, points: 0, locked: false },
        { position: 'PRD2', assetType: 'product' as AssetType, assetId: lineup.prd2Id, assetName: null, points: 0, locked: false },
        { position: 'PHM1', assetType: 'pharmacy' as AssetType, assetId: lineup.phm1Id, assetName: null, points: 0, locked: false },
        { position: 'PHM2', assetType: 'pharmacy' as AssetType, assetId: lineup.phm2Id, assetName: null, points: 0, locked: false },
        { position: 'BRD1', assetType: 'brand' as AssetType, assetId: lineup.brd1Id, assetName: null, points: 0, locked: false },
        { position: 'FLEX', assetType: 'manufacturer' as AssetType, assetId: lineup.flexId, assetName: null, points: 0, locked: false },
      ];
    }
    // Return empty lineup structure
    return [
      { position: 'MFG1', assetType: 'manufacturer' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'MFG2', assetType: 'manufacturer' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'CSTR1', assetType: 'cannabis_strain' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'CSTR2', assetType: 'cannabis_strain' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'PRD1', assetType: 'product' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'PRD2', assetType: 'product' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'PHM1', assetType: 'pharmacy' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'PHM2', assetType: 'pharmacy' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'BRD1', assetType: 'brand' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
      { position: 'FLEX', assetType: 'manufacturer' as AssetType, assetId: null, assetName: null, points: 0, locked: false },
    ];
  };
  
  const [currentLineup, setCurrentLineup] = useState<LineupSlot[]>(() => {
    const initialized = initializeLineup();
    console.log('[LineupEditor] Initialized lineup:', initialized);
    return initialized;
  });

  const handleSaveLineup = () => {
    // Convert lineup to backend format
    const lineupToSave = {
      mfg1Id: currentLineup.find(s => s.position === "MFG1")?.assetId || null,
      mfg2Id: currentLineup.find(s => s.position === "MFG2")?.assetId || null,
      cstr1Id: currentLineup.find(s => s.position === "CSTR1")?.assetId || null,
      cstr2Id: currentLineup.find(s => s.position === "CSTR2")?.assetId || null,
      prd1Id: currentLineup.find(s => s.position === "PRD1")?.assetId || null,
      prd2Id: currentLineup.find(s => s.position === "PRD2")?.assetId || null,
      phm1Id: currentLineup.find(s => s.position === "PHM1")?.assetId || null,
      phm2Id: currentLineup.find(s => s.position === "PHM2")?.assetId || null,
      brd1Id: currentLineup.find(s => s.position === "BRD1")?.assetId || null,
      flexId: currentLineup.find(s => s.position === "FLEX")?.assetId || null,
      flexType: currentLineup.find(s => s.position === "FLEX")?.assetType || null,
    };

    onUpdateLineup(lineupToSave);
    setEditMode(false);
  };

  const handleToggleLock = () => {
    onLockLineup();
  };

  const getPositionIcon = (position: string) => {
    if (!position) return null;
    if (position.startsWith("MFG")) return <Building2 className="w-5 h-5" />;
    if (position.startsWith("CSTR")) return <Leaf className="w-5 h-5" />;
    if (position.startsWith("PRD")) return <Package className="w-5 h-5" />;
    if (position.startsWith("PHM")) return <Building className="w-5 h-5" />;
    if (position.startsWith("BRD")) return <Building2 className="w-5 h-5" />;
    if (position === "FLEX") return <UserCircle className="w-5 h-5" />;
    return null;
  };

  const getPositionColor = (position: string) => {
    if (!position) return "bg-muted";
    if (position.startsWith("MFG")) return "bg-blue-500/10 border-blue-500/20 text-blue-500";
    if (position.startsWith("CSTR")) return "bg-purple-500/10 border-purple-500/20 text-purple-500";
    if (position.startsWith("PRD")) return "bg-pink-500/10 border-pink-500/20 text-pink-500";
    if (position.startsWith("PHM")) return "bg-green-500/10 border-green-500/20 text-green-500";
    if (position.startsWith("BRD")) return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
    if (position === "FLEX") return "bg-orange-500/10 border-orange-500/20 text-orange-500";
    return "bg-muted";
  };

  const getPositionLabel = (position: string) => {
    if (!position) return "Unknown";
    if (position === "MFG1") return "Hersteller 1";
    if (position === "MFG2") return "Hersteller 2";
    if (position === "CSTR1") return "Cannabis Strain 1";
    if (position === "CSTR2") return "Cannabis Strain 2";
    if (position === "PRD1") return "Produkt 1";
    if (position === "PRD2") return "Produkt 2";
    if (position === "PHM1") return "Apotheke 1";
    if (position === "PHM2") return "Apotheke 2";
    if (position === "BRD1") return "Brand";
    if (position === "FLEX") return "Flex (beliebig)";
    return position;
  };

  const getAssetTypeLabel = (assetType: AssetType) => {
    switch (assetType) {
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
    }
  };

  const handleSlotClick = (slot: LineupSlot) => {
    console.log('[handleSlotClick] Clicked slot:', slot);
    console.log('[handleSlotClick] Current lineup before click:', currentLineup);
    
    if (isLocked) {
      toast.error("Lineup ist gesperrt!");
      return;
    }

    if (!editMode) {
      setEditMode(true);
    }

    console.log('[handleSlotClick] Setting selected slot to:', slot.position);
    setSelectedSlot(slot.position);
  };

  const handlePlayerSelect = (player: any) => {
    console.log('[handlePlayerSelect] Called with player:', player);
    console.log('[handlePlayerSelect] selectedSlot:', selectedSlot);
    
    if (!selectedSlot) {
      console.log('[handlePlayerSelect] No slot selected, returning');
      return;
    }

    // Validate player can be assigned to this position
    if (selectedSlot !== "FLEX") {
      const requiredType = getRequiredAssetType(selectedSlot);
      console.log('[handlePlayerSelect] Required type:', requiredType, 'Player type:', player.assetType);
      if (player.assetType !== requiredType) {
        console.log('[handlePlayerSelect] Type mismatch, showing error');
        toast.error(`Diese Position erfordert: ${getAssetTypeLabel(requiredType)}`);
        return;
      }
    }

    // Update lineup
    console.log('[handlePlayerSelect] Updating lineup...');
    const updatedLineup = currentLineup.map(slot => 
      slot.position === selectedSlot
        ? { ...slot, assetId: player.assetId, assetName: player.name || 'Unknown', assetType: player.assetType, points: 0 }
        : slot
    );

    console.log('[handlePlayerSelect] Updated lineup:', updatedLineup);
    setCurrentLineup(updatedLineup);
    setSelectedSlot(null);
    setEditMode(true);
    toast.success(`${player.name} zu ${getPositionLabel(selectedSlot)} hinzugefügt!`);
  };

  const handleRemovePlayer = (slot: LineupSlot) => {
    if (isLocked) {
      toast.error("Lineup ist gesperrt!");
      return;
    }

    const updatedLineup = currentLineup.map(s => 
      s.position === slot.position
        ? { ...s, assetId: null, assetName: null, points: 0 }
        : s
    );

    setCurrentLineup(updatedLineup);
    setEditMode(true);
    toast.success("Spieler entfernt!");
  };

  const getRequiredAssetType = (position: string): AssetType => {
    if (!position) return "manufacturer";
    if (position.startsWith("MFG")) return "manufacturer";
    if (position.startsWith("CSTR")) return "cannabis_strain";
    if (position.startsWith("PRD")) return "product";
    if (position.startsWith("PHM")) return "pharmacy";
    if (position.startsWith("BRD")) return "brand";
    return "manufacturer"; // Default
  };

  const handleLockLineup = () => {
    if (!isLocked) {
      // Check if all positions are filled
      const emptySlots = currentLineup.filter((slot) => !slot.assetId);
      if (emptySlots.length > 0) {
        toast.error(`Bitte fülle alle Positionen aus! ${emptySlots.length} Position(en) leer.`);
        return;
      }
    }

    handleToggleLock();
  };

  // Calculate total projected points
  const totalPoints = currentLineup.reduce((sum, slot) => sum + (slot.points || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Lineup - Woche {week}
              {isLocked && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Gesperrt
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Projizierte Punkte</p>
                <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
              </div>
              {editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveLineup}
                  disabled={false}
                  className="flex items-center gap-2"
                >
                  Speichern
                </Button>
              )}
              <Button
                variant={isLocked ? "outline" : "default"}
                size="sm"
                onClick={handleLockLineup}
                disabled={false}
                className="flex items-center gap-2"
              >
                {isLocked ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    Entsperren
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Sperren
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lineup Slots */}
      <div className="grid gap-4">
        {/* Manufacturers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Hersteller (2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentLineup
              .filter((slot) => slot && slot.position && slot.position.startsWith("MFG"))
              .map((slot) => (
                <LineupSlotCard
                  key={slot.position}
                  slot={slot}
                  onClick={() => handleSlotClick(slot)}
                  isLocked={isLocked}
                  getPositionLabel={getPositionLabel}
                  getPositionColor={getPositionColor}
                  getPositionIcon={getPositionIcon}
                  getAssetTypeLabel={getAssetTypeLabel}
                />
              ))}
          </CardContent>
        </Card>

        {/* Cannabis Strains */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="w-5 h-5 text-purple-500" />
              Cannabis Strains (2)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Genetik/Sorten wie Gelato, OG Kush, etc.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentLineup
              .filter((slot) => slot && slot.position && slot.position.startsWith("CSTR"))
              .map((slot) => (
                <LineupSlotCard
                  key={slot.position}
                  slot={slot}
                  onClick={() => handleSlotClick(slot)}
                  isLocked={isLocked}
                  getPositionLabel={getPositionLabel}
                  getPositionColor={getPositionColor}
                  getPositionIcon={getPositionIcon}
                  getAssetTypeLabel={getAssetTypeLabel}
                />
              ))}
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-pink-500" />
              Produkte (2)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Pharmazeutische Produkte von Herstellern</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentLineup
              .filter((slot) => slot && slot.position && slot.position.startsWith("PRD"))
              .map((slot) => (
                <LineupSlotCard
                  key={slot.position}
                  slot={slot}
                  onClick={() => handleSlotClick(slot)}
                  isLocked={isLocked}
                  getPositionLabel={getPositionLabel}
                  getPositionColor={getPositionColor}
                  getPositionIcon={getPositionIcon}
                  getAssetTypeLabel={getAssetTypeLabel}
                />
              ))}
          </CardContent>
        </Card>

        {/* Pharmacies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-green-500" />
              Apotheken (2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentLineup
              .filter((slot) => slot && slot.position && slot.position.startsWith("PHM"))
              .map((slot) => (
                <LineupSlotCard
                  key={slot.position}
                  slot={slot}
                  onClick={() => handleSlotClick(slot)}
                  isLocked={isLocked}
                  getPositionLabel={getPositionLabel}
                  getPositionColor={getPositionColor}
                  getPositionIcon={getPositionIcon}
                  getAssetTypeLabel={getAssetTypeLabel}
                />
              ))}
          </CardContent>
        </Card>

        {/* Brands */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-yellow-500" />
              Brands (1)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentLineup
              .filter((slot) => slot && slot.position && slot.position.startsWith("BRD"))
              .map((slot) => (
                <LineupSlotCard
                  key={slot.position}
                  slot={slot}
                  onClick={() => handleSlotClick(slot)}
                  isLocked={isLocked}
                  getPositionLabel={getPositionLabel}
                  getPositionColor={getPositionColor}
                  getPositionIcon={getPositionIcon}
                  getAssetTypeLabel={getAssetTypeLabel}
                />
              ))}
          </CardContent>
        </Card>

        {/* FLEX */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-orange-500" />
              Flex (1)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Beliebige Kategorie</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentLineup
              .filter((slot) => slot && slot.position === "FLEX")
              .map((slot) => (
                <LineupSlotCard
                  key={slot.position}
                  slot={slot}
                  onClick={() => handleSlotClick(slot)}
                  isLocked={isLocked}
                  getPositionLabel={getPositionLabel}
                  getPositionColor={getPositionColor}
                  getPositionIcon={getPositionIcon}
                  getAssetTypeLabel={getAssetTypeLabel}
                />
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Roster Display */}
      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Mein Roster {selectedSlot && `(Wähle Spieler für ${getPositionLabel(selectedSlot)})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roster.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Keine Spieler im Roster</p>
            ) : (
              <div className="grid gap-2">
                {roster.map((player: any) => {
                  const isInLineup = currentLineup.some(slot => slot.assetId === player.assetId && slot.assetType === player.assetType);
                  const canSelect = !selectedSlot || selectedSlot === "FLEX" || getRequiredAssetType(selectedSlot) === player.assetType;
                  
                  return (
                    <button
                      key={`${player.assetType}-${player.assetId}`}
                      onClick={() => selectedSlot && canSelect ? handlePlayerSelect(player) : null}
                      disabled={!selectedSlot || !canSelect}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        isInLineup
                          ? "border-green-500/50 bg-green-500/10 opacity-60"
                          : selectedSlot && canSelect
                          ? "border-primary/50 hover:border-primary hover:bg-primary/5 cursor-pointer"
                          : "border-border bg-muted/30 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-background/50">
                            {player.assetType === "manufacturer" && <Building2 className="w-4 h-4 text-blue-500" />}
                            {player.assetType === "cannabis_strain" && <Leaf className="w-4 h-4 text-purple-500" />}
                            {player.assetType === "product" && <Package className="w-4 h-4 text-pink-500" />}
                            {player.assetType === "pharmacy" && <Building className="w-4 h-4 text-green-500" />}
                            {player.assetType === "brand" && <Building2 className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{player.name}</p>
                            <p className="text-xs text-muted-foreground">{getAssetTypeLabel(player.assetType)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {isInLineup && (
                            <Badge variant="secondary" className="text-xs">In Lineup</Badge>
                          )}
                          {player.points !== undefined && (
                            <p className="text-sm font-bold text-foreground mt-1">{player.points} Pkt</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * LineupSlotCard Component
 * Individual lineup slot display
 */
function LineupSlotCard({
  slot,
  onClick,
  isLocked,
  getPositionLabel,
  getPositionColor,
  getPositionIcon,
  getAssetTypeLabel,
}: {
  slot: LineupSlot;
  onClick: () => void;
  isLocked: boolean;
  getPositionLabel: (position: string) => string;
  getPositionColor: (position: string) => string;
  getPositionIcon: (position: string) => React.ReactNode;
  getAssetTypeLabel: (assetType: AssetType) => string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`w-full p-4 rounded-lg border-2 transition-all ${
        isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary"
      } ${getPositionColor(slot.position)} ${
        !slot.assetId ? "border-dashed" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-background/50">
            {getPositionIcon(slot.position)}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-muted-foreground">
              {getPositionLabel(slot.position)}
            </p>
            {slot.assetId ? (
              <>
                <p className="text-base font-bold text-foreground">{slot.assetName}</p>
                <p className="text-xs text-muted-foreground">
                  {getAssetTypeLabel(slot.assetType)}
                </p>
              </>
            ) : (
              <p className="text-base text-muted-foreground italic">Leer</p>
            )}
          </div>
        </div>
        {slot.points !== undefined && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Punkte</p>
            <p className="text-xl font-bold text-foreground">{slot.points}</p>
          </div>
        )}
      </div>
    </button>
  );
}
