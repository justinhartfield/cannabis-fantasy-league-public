import { useState, useMemo } from "react";
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
import { Loader2, Check, Image, Sparkles } from "lucide-react";

// Available battlefield backgrounds from client/public/assets/illustrations/backgrounds
export const BATTLEFIELD_BACKGROUNDS = [
  { id: "chill-chaser", name: "Chill Chaser", file: "01_Chill-Chaser_Background.png" },
  { id: "connoisseur", name: "Connoisseur", file: "02_Connoisseur_Background.png" },
  { id: "microdoser", name: "Microdoser", file: "03_Microdoser_Background.png" },
  { id: "creative", name: "Creative", file: "04_Creative_Background.png" },
  { id: "healer", name: "Healer", file: "05_Healer_Background.png" },
  { id: "after-work-unwinder", name: "After-Work Unwinder", file: "06_After-Work-Unwinder_Background.png" },
  { id: "athlete", name: "Athlete", file: "07_Athlete_Background.png" },
  { id: "wellness-seeker", name: "Wellness Seeker", file: "08_Wellness-Seeker_Background.png" },
  { id: "easy-dreamer", name: "Easy Dreamer", file: "09_Easy-Dreamer_Background.png" },
  { id: "party-goer", name: "Party Goer", file: "10_Party-Goer_Background.png" },
] as const;

export type BattlefieldBackground = (typeof BATTLEFIELD_BACKGROUNDS)[number];

export function getBackgroundByFile(file: string | null | undefined): BattlefieldBackground | undefined {
  if (!file) return undefined;
  return BATTLEFIELD_BACKGROUNDS.find((bg) => bg.file === file);
}

export function getBackgroundById(id: string | null | undefined): BattlefieldBackground | undefined {
  if (!id) return undefined;
  return BATTLEFIELD_BACKGROUNDS.find((bg) => bg.id === id);
}

/**
 * Get a random battlefield background
 * Uses a seeded random based on team ID for consistency
 */
export function getRandomBackground(seed?: number): BattlefieldBackground {
  const index = seed !== undefined 
    ? Math.abs(seed) % BATTLEFIELD_BACKGROUNDS.length 
    : Math.floor(Math.random() * BATTLEFIELD_BACKGROUNDS.length);
  return BATTLEFIELD_BACKGROUNDS[index];
}

interface BackgroundPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  currentBackground?: string | null;
  onSelect?: (background: BattlefieldBackground) => void;
}

export function BackgroundPicker({
  open,
  onOpenChange,
  teamId,
  currentBackground,
  onSelect,
}: BackgroundPickerProps) {
  const [selectedBackground, setSelectedBackground] = useState<BattlefieldBackground | null>(
    () => getBackgroundByFile(currentBackground) || null
  );

  const updateBackgroundMutation = trpc.league.updateTeamBackground.useMutation({
    onSuccess: () => {
      toast.success("Background selected!");
      if (selectedBackground) {
        onSelect?.(selectedBackground);
      }
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to select background: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!selectedBackground) {
      toast.error("Please select a background first");
      return;
    }
    updateBackgroundMutation.mutate({
      teamId,
      battlefieldBackground: selectedBackground.file,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gradient-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Image className="w-6 h-6 text-primary" />
            <span className="text-gradient-primary">Choose Your Battlefield</span>
            <Sparkles className="w-6 h-6 text-secondary" />
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Select the arena where your battles will unfold!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-6">
          {BATTLEFIELD_BACKGROUNDS.map((background) => {
            const isSelected = selectedBackground?.id === background.id;
            const isCurrent = currentBackground === background.file;

            return (
              <button
                key={background.id}
                onClick={() => setSelectedBackground(background)}
                className={cn(
                  "relative group flex flex-col items-center p-2 rounded-2xl border-2 transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg",
                  isSelected
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                )}
              >
                {/* Background Preview */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <img
                    src={`/assets/illustrations/backgrounds/${background.file}`}
                    alt={background.name}
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-300",
                      isSelected && "scale-105"
                    )}
                  />
                  {/* Overlay for selected state */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20" />
                  )}
                </div>

                {/* Background Name */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center truncate w-full",
                    isSelected ? "text-primary" : "text-white/70"
                  )}
                >
                  {background.name}
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
            disabled={!selectedBackground || updateBackgroundMutation.isPending}
            className="gradient-primary text-black font-semibold"
          >
            {updateBackgroundMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Select Background
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Background preview component for displaying selected background
export function BackgroundPreview({
  background,
  className,
}: {
  background: string | null | undefined;
  className?: string;
}) {
  const backgroundData = getBackgroundByFile(background);

  if (!backgroundData) {
    return null;
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      <img
        src={`/assets/illustrations/backgrounds/${backgroundData.file}`}
        alt={backgroundData.name}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

