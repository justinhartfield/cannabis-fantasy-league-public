import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Leaf, 
  Package, 
  GripVertical, 
  X, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Star,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

interface WishlistItem {
  id: number;
  assetType: string;
  assetId: number;
  priority: number;
  name: string;
  imageUrl: string | null;
  isDrafted: boolean;
}

interface AutoDraftBoardProps {
  leagueId: number;
  onClose?: () => void;
}

/**
 * AutoDraftBoard Component
 * 
 * Allows users to manage their auto-draft wishlist:
 * - View ranked list of preferred players
 * - Reorder items via drag-and-drop or buttons
 * - Remove items from wishlist
 * - Visual indicators for drafted players
 */
export function AutoDraftBoard({ leagueId, onClose }: AutoDraftBoardProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { 
    data: wishlist = [], 
    isLoading, 
    refetch: refetchWishlist 
  } = trpc.autoDraft.getMyAutoDraftBoard.useQuery({ leagueId });

  const removeFromWishlistMutation = trpc.autoDraft.removeFromMyAutoDraftBoard.useMutation({
    onSuccess: () => {
      toast.success("Spieler von Wunschliste entfernt");
      refetchWishlist();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const reorderMutation = trpc.autoDraft.reorderAutoDraftBoard.useMutation({
    onSuccess: () => {
      refetchWishlist();
    },
    onError: (error) => {
      toast.error(`Fehler beim Sortieren: ${error.message}`);
    },
  });

  const moveToPositionMutation = trpc.autoDraft.moveToPosition.useMutation({
    onSuccess: () => {
      refetchWishlist();
    },
    onError: (error) => {
      toast.error(`Fehler beim Verschieben: ${error.message}`);
    },
  });

  const clearWishlistMutation = trpc.autoDraft.clearAutoDraftBoard.useMutation({
    onSuccess: () => {
      toast.success("Wunschliste geleert");
      refetchWishlist();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  // Get user's team ID (needed for reorder mutation)
  const { data: myTeam } = trpc.league.getMyTeam.useQuery({ leagueId });

  const handleRemove = (item: WishlistItem) => {
    removeFromWishlistMutation.mutate({
      leagueId,
      assetType: item.assetType as AssetType,
      assetId: item.assetId,
    });
  };

  const handleMoveUp = (item: WishlistItem, index: number) => {
    if (index === 0 || !myTeam) return;
    moveToPositionMutation.mutate({
      teamId: myTeam.id,
      itemId: item.id,
      newPosition: index, // 1-based, so moving up from index means position = index
    });
  };

  const handleMoveDown = (item: WishlistItem, index: number) => {
    if (index === wishlist.length - 1 || !myTeam) return;
    moveToPositionMutation.mutate({
      teamId: myTeam.id,
      itemId: item.id,
      newPosition: index + 2, // 1-based, moving down means position = index + 2
    });
  };

  const handleClearAll = () => {
    if (!myTeam) return;
    if (confirm("Möchtest du wirklich die gesamte Wunschliste löschen?")) {
      clearWishlistMutation.mutate({ teamId: myTeam.id });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, itemId: number) => {
    e.preventDefault();
    if (draggedItem !== itemId) {
      setDragOverItem(itemId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedItem === null || !myTeam) return;

    const draggedIndex = wishlist.findIndex((item) => item.id === draggedItem);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    // Create new order
    const newOrder = [...wishlist];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    // Send reorder mutation
    reorderMutation.mutate({
      teamId: myTeam.id,
      orderedIds: newOrder.map((item) => item.id),
    });

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Get icon based on asset type
  const getIcon = (assetType: string) => {
    const iconClass = "w-4 h-4";
    switch (assetType) {
      case "manufacturer":
        return <Building2 className={cn(iconClass, "text-blue-400")} />;
      case "cannabis_strain":
        return <Leaf className={cn(iconClass, "text-purple-400")} />;
      case "product":
        return <Package className={cn(iconClass, "text-pink-400")} />;
      case "pharmacy":
        return <Building2 className={cn(iconClass, "text-green-400")} />;
      case "brand":
        return <Building2 className={cn(iconClass, "text-yellow-400")} />;
      default:
        return <Star className={cn(iconClass, "text-gray-400")} />;
    }
  };

  // Get category label
  const getCategoryLabel = (assetType: string) => {
    switch (assetType) {
      case "manufacturer": return "Hersteller";
      case "cannabis_strain": return "Strain";
      case "product": return "Produkt";
      case "pharmacy": return "Apotheke";
      case "brand": return "Brand";
      default: return assetType;
    }
  };

  // Filter out drafted items for display
  const availableItems = wishlist.filter((item) => !item.isDrafted);
  const draftedItems = wishlist.filter((item) => item.isDrafted);

  return (
    <Card className="rounded-[32px] border-0 bg-gradient-to-br from-[#2c1140] via-[#1c0f2a] to-[#14091f] text-white shadow-[0_25px_60px_rgba(10,5,20,0.6)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#cfff4d]/20 to-[#8dff8c]/20">
              <Sparkles className="w-5 h-5 text-[#cfff4d]" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Auto-Draft Board</CardTitle>
              <p className="text-xs text-white/60">
                {availableItems.length} Spieler verfügbar • Drag & Drop zum Sortieren
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wishlist.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={clearWishlistMutation.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Leeren
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-white/60">Lädt...</div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
              <Star className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-white/60">
              Keine Spieler auf der Wunschliste.
            </p>
            <p className="text-xs text-white/40">
              Füge Spieler aus dem Draft Board hinzu, um dein Auto-Draft zu konfigurieren.
            </p>
          </div>
        ) : (
          <>
            {/* Available items - can be reordered */}
            <div className="space-y-2">
              {availableItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5 cursor-grab active:cursor-grabbing transition-all",
                    draggedItem === item.id && "opacity-50 scale-95",
                    dragOverItem === item.id && "border-[#cfff4d]/50 bg-[#cfff4d]/10"
                  )}
                >
                  {/* Priority rank */}
                  <div className="flex flex-col items-center gap-1 min-w-[40px]">
                    <span className="text-2xl font-bold text-[#cfff4d]">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Drag handle */}
                  <GripVertical className="w-5 h-5 text-white/30 group-hover:text-white/60" />

                  {/* Item image/icon */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      {getIcon(item.assetType)}
                    </div>
                  )}

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <span className="text-xs text-white/50">
                      {getCategoryLabel(item.assetType)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                      onClick={() => handleMoveUp(item, index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                      onClick={() => handleMoveDown(item, index)}
                      disabled={index === availableItems.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => handleRemove(item)}
                      disabled={removeFromWishlistMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Drafted items - shown at bottom, greyed out */}
            {draftedItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
                  Bereits gedraftet ({draftedItems.length})
                </p>
                <div className="space-y-2 opacity-50">
                  {draftedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/5"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-8 h-8 object-contain rounded-lg bg-white/10 p-1 grayscale"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center grayscale">
                          {getIcon(item.assetType)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-through truncate">{item.name}</p>
                        <span className="text-xs text-white/40">
                          {getCategoryLabel(item.assetType)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="bg-white/10 text-white/50">
                        Gedraftet
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Help text */}
        {wishlist.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-[#cfff4d]/10 border border-[#cfff4d]/20">
            <p className="text-xs text-[#cfff4d]/80">
              <strong>Tipp:</strong> Wenn der Timer abläuft, wird automatisch der höchste 
              verfügbare Spieler von deiner Wunschliste gedraftet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * WishlistButton Component
 * 
 * Small button to add/remove a player from wishlist, used in DraftAssetCard
 */
interface WishlistButtonProps {
  leagueId: number;
  assetType: AssetType;
  assetId: number;
  assetName: string;
  isInWishlist?: boolean;
  onToggle?: (isNowInWishlist: boolean) => void;
  className?: string;
}

export function WishlistButton({
  leagueId,
  assetType,
  assetId,
  assetName,
  isInWishlist: controlledIsInWishlist,
  onToggle,
  className,
}: WishlistButtonProps) {
  const utils = trpc.useUtils();

  // Query wishlist status if not controlled
  const { data: isInWishlistFromQuery } = trpc.autoDraft.isInMyWishlist.useQuery(
    { leagueId, assetType, assetId },
    { enabled: controlledIsInWishlist === undefined }
  );

  const isInWishlist = controlledIsInWishlist ?? isInWishlistFromQuery ?? false;

  const addMutation = trpc.autoDraft.addToMyAutoDraftBoard.useMutation({
    onSuccess: (data) => {
      // Handle success: false responses (e.g., table doesn't exist, already in wishlist)
      if (!data.success) {
        if (data.error?.includes("already in wishlist")) {
          toast.info("Spieler bereits auf der Wunschliste");
        } else if (data.error?.includes("not available yet")) {
          toast.error("Wunschliste noch nicht verfügbar. Datenbank-Migration erforderlich.");
        } else {
          toast.error(data.error || "Fehler beim Hinzufügen");
        }
        return;
      }
      toast.success(`${assetName} zur Wunschliste hinzugefügt`);
      utils.autoDraft.getMyAutoDraftBoard.invalidate({ leagueId });
      utils.autoDraft.isInMyWishlist.invalidate({ leagueId, assetType, assetId });
      onToggle?.(true);
    },
    onError: (error) => {
      if (error.message.includes("already in wishlist")) {
        toast.info("Spieler bereits auf der Wunschliste");
      } else {
        toast.error(`Fehler: ${error.message}`);
      }
    },
  });

  const removeMutation = trpc.autoDraft.removeFromMyAutoDraftBoard.useMutation({
    onSuccess: () => {
      toast.success(`${assetName} von Wunschliste entfernt`);
      utils.autoDraft.getMyAutoDraftBoard.invalidate({ leagueId });
      utils.autoDraft.isInMyWishlist.invalidate({ leagueId, assetType, assetId });
      onToggle?.(false);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const isLoading = addMutation.isPending || removeMutation.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWishlist) {
      removeMutation.mutate({ leagueId, assetType, assetId });
    } else {
      addMutation.mutate({ leagueId, assetType, assetId });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "h-8 w-8 rounded-full transition-all",
        isInWishlist
          ? "bg-[#cfff4d]/20 text-[#cfff4d] hover:bg-[#cfff4d]/30"
          : "bg-white/10 text-white/50 hover:text-[#cfff4d] hover:bg-white/20",
        className
      )}
      title={isInWishlist ? "Von Wunschliste entfernen" : "Zur Wunschliste hinzufügen"}
    >
      <Star
        className={cn(
          "w-4 h-4 transition-all",
          isInWishlist && "fill-current"
        )}
      />
    </Button>
  );
}

export default AutoDraftBoard;

