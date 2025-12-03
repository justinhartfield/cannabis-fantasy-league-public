/**
 * HalftimeSubstitutionModal Component
 * 
 * Modal for making halftime lineup substitutions (soccer-style subs).
 * Allows users to swap up to 2 assets during the halftime window.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  ArrowRightLeft, 
  Loader2,
  CheckCircle2,
  Factory,
  Leaf,
  Package,
  Building2,
  Tag
} from "lucide-react";

interface RosterAsset {
  id: number;
  assetType: string;
  assetId: number;
  assetName: string;
  imageUrl?: string | null;
  points: number;
  position: string;
}

interface HalftimeSubstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: number;
  teamId: number;
  currentLineup: RosterAsset[];
  benchAssets: RosterAsset[];
  remainingSubstitutions: number;
  onSubstitutionComplete?: () => void;
}

// Position icons
const positionIcons: Record<string, React.ReactNode> = {
  mfg1: <Factory className="w-4 h-4" />,
  mfg2: <Factory className="w-4 h-4" />,
  cstr1: <Leaf className="w-4 h-4" />,
  cstr2: <Leaf className="w-4 h-4" />,
  prd1: <Package className="w-4 h-4" />,
  prd2: <Package className="w-4 h-4" />,
  phm1: <Building2 className="w-4 h-4" />,
  phm2: <Building2 className="w-4 h-4" />,
  brd1: <Tag className="w-4 h-4" />,
  flex: <ArrowRightLeft className="w-4 h-4" />,
};

// Position labels
const positionLabels: Record<string, string> = {
  mfg1: "Manufacturer 1",
  mfg2: "Manufacturer 2",
  cstr1: "Cannabis Strain 1",
  cstr2: "Cannabis Strain 2",
  prd1: "Product 1",
  prd2: "Product 2",
  phm1: "Pharmacy 1",
  phm2: "Pharmacy 2",
  brd1: "Brand",
  flex: "FLEX",
};

export function HalftimeSubstitutionModal({
  open,
  onOpenChange,
  challengeId,
  teamId,
  currentLineup,
  benchAssets,
  remainingSubstitutions,
  onSubstitutionComplete,
}: HalftimeSubstitutionModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedNewAssetId, setSelectedNewAssetId] = useState<number | null>(null);
  const [selectedNewAssetType, setSelectedNewAssetType] = useState<string>("");

  // Get current asset at selected position
  const currentAssetAtPosition = currentLineup.find(a => a.position === selectedPosition);

  // Filter bench assets that can replace the selected position
  const availableReplacements = benchAssets.filter(asset => {
    if (!currentAssetAtPosition) return false;
    // FLEX can be any type, others must match
    if (selectedPosition === 'flex') return true;
    return asset.assetType === currentAssetAtPosition.assetType;
  });

  // Mutation for making substitution
  const makeSubstitution = trpc.challenge?.makeHalftimeSubstitution?.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || "Substitution successful!");
        setSelectedPosition("");
        setSelectedNewAssetId(null);
        setSelectedNewAssetType("");
        onSubstitutionComplete?.();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to make substitution");
    },
  });

  const handleSubstitution = () => {
    if (!selectedPosition || selectedNewAssetId === null || !selectedNewAssetType) {
      toast.error("Please select a position and replacement asset");
      return;
    }

    makeSubstitution?.mutate({
      challengeId,
      teamId,
      position: selectedPosition,
      newAssetType: selectedNewAssetType,
      newAssetId: selectedNewAssetId,
    });
  };

  const canMakeSub = remainingSubstitutions > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowRightLeft className="w-6 h-6 text-green-400" />
            Halftime Substitutions
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Make tactical lineup changes during halftime. Soccer-style subs!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Remaining Subs Counter */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/60">Substitutions Remaining</span>
            <div className="flex items-center gap-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full",
                    i < remainingSubstitutions
                      ? "bg-green-500"
                      : "bg-white/20"
                  )}
                />
              ))}
              <Badge 
                className={cn(
                  "ml-2",
                  remainingSubstitutions > 0 
                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                    : "bg-red-500/20 text-red-400 border-red-500/50"
                )}
              >
                {remainingSubstitutions}/2
              </Badge>
            </div>
          </div>

          {!canMakeSub ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-3" />
              <p className="text-white/80">All substitutions used!</p>
              <p className="text-sm text-white/50 mt-1">
                Good luck in the second half!
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Select Position */}
              <div className="space-y-2">
                <label className="text-sm text-white/60">
                  1. Select position to substitute
                </label>
                <Select
                  value={selectedPosition}
                  onValueChange={(value) => {
                    setSelectedPosition(value);
                    setSelectedNewAssetId(null);
                    setSelectedNewAssetType("");
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Choose a position..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    {currentLineup.map((asset) => (
                      <SelectItem 
                        key={asset.position} 
                        value={asset.position}
                        className="text-white hover:bg-white/10"
                      >
                        <div className="flex items-center gap-2">
                          {positionIcons[asset.position]}
                          <span>{positionLabels[asset.position] || asset.position}</span>
                          <span className="text-white/40">-</span>
                          <span className="text-white/60">{asset.assetName}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {asset.points}pts
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Player at Position */}
              {currentAssetAtPosition && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="text-xs text-red-400 uppercase mb-1">OUT</div>
                  <div className="flex items-center gap-3">
                    {currentAssetAtPosition.imageUrl && (
                      <img
                        src={currentAssetAtPosition.imageUrl}
                        alt={currentAssetAtPosition.assetName}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{currentAssetAtPosition.assetName}</div>
                      <div className="text-xs text-white/40">{currentAssetAtPosition.assetType}</div>
                    </div>
                    <Badge variant="outline">{currentAssetAtPosition.points} pts</Badge>
                  </div>
                </div>
              )}

              {/* Step 2: Select Replacement */}
              {selectedPosition && availableReplacements.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-white/60">
                    2. Select replacement from bench
                  </label>
                  <Select
                    value={selectedNewAssetId?.toString() || ""}
                    onValueChange={(value) => {
                      const asset = availableReplacements.find(a => a.assetId.toString() === value);
                      if (asset) {
                        setSelectedNewAssetId(asset.assetId);
                        setSelectedNewAssetType(asset.assetType);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Choose replacement..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {availableReplacements.map((asset) => (
                        <SelectItem 
                          key={`${asset.assetType}-${asset.assetId}`} 
                          value={asset.assetId.toString()}
                          className="text-white hover:bg-white/10"
                        >
                          <div className="flex items-center gap-2">
                            <span>{asset.assetName}</span>
                            <span className="text-white/40 text-xs">({asset.assetType})</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {asset.points}pts
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* New Player Preview */}
              {selectedNewAssetId !== null && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="text-xs text-green-400 uppercase mb-1">IN</div>
                  {(() => {
                    const newAsset = availableReplacements.find(a => a.assetId === selectedNewAssetId);
                    if (!newAsset) return null;
                    return (
                      <div className="flex items-center gap-3">
                        {newAsset.imageUrl && (
                          <img
                            src={newAsset.imageUrl}
                            alt={newAsset.assetName}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{newAsset.assetName}</div>
                          <div className="text-xs text-white/40">{newAsset.assetType}</div>
                        </div>
                        <Badge variant="outline">{newAsset.points} pts</Badge>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubstitution}
                disabled={
                  !selectedPosition || 
                  selectedNewAssetId === null || 
                  makeSubstitution?.isPending
                }
                className="w-full bg-green-600 hover:bg-green-500"
              >
                {makeSubstitution?.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Making Substitution...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Confirm Substitution
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default HalftimeSubstitutionModal;

