import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendIndicator } from "@/components/TrendIndicator";
import { LucideProps } from "lucide-react";

interface TopPerformerCardProps {
  performer: {
    name: string;
    type: string;
    total: number;
  };
  icon: React.ComponentType<LucideProps>;
  label: string;
  variant: "primary" | "secondary" | "purple" | "blue" | "green";
}

export function TopPerformerCard({
  performer,
  icon: Icon,
  label,
  variant,
}: TopPerformerCardProps) {
  const getVariantClass = () => {
    switch (variant) {
      case "primary":
        return "from-red-500/10 to-red-500/5 border-red-500/20 text-red-500";
      case "secondary":
        return "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-500";
      case "purple":
        return "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-500";
      case "green":
        return "from-green-500/10 to-green-500/5 border-green-500/20 text-green-500";
      default:
        return "from-gray-500/10 to-gray-500/5 border-gray-500/20 text-gray-500";
    }
  };

  return (
    <Card
      className={`bg-gradient-to-br ${getVariantClass()} overflow-hidden card-hover-lift`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <div className="text-sm font-semibold">{label}</div>
          </div>
          <Badge variant="outline" className="text-xs">
            +{performer.total.toFixed(1)} Pts
          </Badge>
        </div>
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold text-foreground truncate">
            {performer.name}
          </div>
          <div className="text-xs text-muted-foreground uppercase">
            {performer.type}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
