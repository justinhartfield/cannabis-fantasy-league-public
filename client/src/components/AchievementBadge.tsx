import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Award, Star, Trophy, Medal } from "lucide-react";

interface AchievementBadgeProps {
  type: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: string;
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({ type, name, description, iconUrl, earnedAt, size = "md" }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  // Fallback icons based on type if no URL
  const renderIcon = () => {
    if (iconUrl && iconUrl.startsWith("/")) {
        // For now we don't actually have these images, so use Lucide icons as fallbacks unless it's a real URL
        // But the service writes paths like /badges/... which don't exist.
        // So we will switch on type.
    }
    
    switch (type) {
        case "FIRST_WIN": return <Star className={cn("text-yellow-500", iconSizes[size])} />;
        case "HIGH_SCORER": return <Trophy className={cn("text-purple-500", iconSizes[size])} />;
        case "UNDEFEATED": return <Medal className={cn("text-orange-500", iconSizes[size])} />;
        case "CLOSE_CALL": return <Award className={cn("text-blue-500", iconSizes[size])} />;
        default: return <Award className={cn("text-primary", iconSizes[size])} />;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm transition-transform hover:scale-105 cursor-help",
            sizeClasses[size]
          )}>
            {renderIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-center max-w-[200px]">
          <p className="font-bold text-primary">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            Earned: {new Date(earnedAt).toLocaleDateString()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


