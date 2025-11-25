import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Check, Swords } from "lucide-react";

// Available fighter illustrations from client/public/assets/illustrations
export const FIGHTER_ILLUSTRATIONS = [
  { id: "bud-inspector", name: "Bud Inspector", file: "Bud-Inspector_Sticker_Alpha.gif" },
  { id: "cloud", name: "Cloud", file: "Cloud_Sticker_Alpha.gif" },
  { id: "family-flower", name: "Family Flower", file: "Family_Flower_Sticker_Alpha.gif" },
  { id: "flower", name: "Flower", file: "Flower_Sticker_Alpha.gif" },
  { id: "goddess", name: "Goddess", file: "Goddess_Sticker_Alpha.gif" },
  { id: "heart", name: "Heart", file: "Heart_Sticker_Alpha.gif" },
  { id: "ice-cream", name: "Ice Cream", file: "Ice-Cream_Sticker_Alpha.gif" },
  { id: "pancake", name: "Pancake", file: "Pancake_Sticker_Alpha.gif" },
  { id: "pillow", name: "Pillow", file: "Pillow_Sticker_Alpha.gif" },
  { id: "world", name: "World", file: "World_Sticker_Alpha.gif" },
] as const;

export type FighterIllustration = (typeof FIGHTER_ILLUSTRATIONS)[number];

export function getFighterByFile(file: string | null | undefined): FighterIllustration | undefined {
  if (!file) return undefined;
  return FIGHTER_ILLUSTRATIONS.find((f) => f.file === file);
}

export function getFighterById(id: string | null | undefined): FighterIllustration | undefined {
  if (!id) return undefined;
  return FIGHTER_ILLUSTRATIONS.find((f) => f.id === id);
}

interface FighterPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  currentFighter?: string | null;
  onSelect?: (fighter: FighterIllustration) => void;
}

export function FighterPicker({
  open,
  onOpenChange,
  teamId,
  currentFighter,
  onSelect,
}: FighterPickerProps) {
  const [selectedFighter, setSelectedFighter] = useState<FighterIllustration | null>(
    () => getFighterByFile(currentFighter) || null
  );

  const updateFighterMutation = trpc.league.updateTeamFighter.useMutation({
    onSuccess: (data) => {
      toast.success("Fighter selected!");
      if (selectedFighter) {
        onSelect?.(selectedFighter);
      }
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to select fighter: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!selectedFighter) {
      toast.error("Please select a fighter first");
      return;
    }
    updateFighterMutation.mutate({
      teamId,
      fighterIllustration: selectedFighter.file,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gradient-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            <span className="text-gradient-primary">Choose Your Fighter</span>
            <Swords className="w-6 h-6 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Select your champion to represent you in battle!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-6">
          {FIGHTER_ILLUSTRATIONS.map((fighter) => {
            const isSelected = selectedFighter?.id === fighter.id;
            const isCurrent = currentFighter === fighter.file;

            return (
              <button
                key={fighter.id}
                onClick={() => setSelectedFighter(fighter)}
                className={cn(
                  "relative group flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg",
                  isSelected
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                )}
              >
                {/* Fighter Image */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                  <img
                    src={`/assets/illustrations/${fighter.file}`}
                    alt={fighter.name}
                    className={cn(
                      "w-full h-full object-contain transition-transform duration-300",
                      isSelected && "animate-bounce-subtle"
                    )}
                  />
                </div>

                {/* Fighter Name */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center truncate w-full",
                    isSelected ? "text-primary" : "text-white/70"
                  )}
                >
                  {fighter.name}
                </span>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" />
                  </div>
                )}

                {/* Current Badge */}
                {isCurrent && !isSelected && (
                  <div className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] text-white/80">
                    Current
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/30 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedFighter || updateFighterMutation.isPending}
            className="gradient-primary text-black font-semibold"
          >
            {updateFighterMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Select Fighter
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Smaller inline fighter display component
export function FighterDisplay({
  fighter,
  size = "md",
  className,
}: {
  fighter: string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const fighterData = getFighterByFile(fighter);
  
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-32 h-32",
  };

  if (!fighterData) {
    return null;
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <img
        src={`/assets/illustrations/${fighterData.file}`}
        alt={fighterData.name}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

