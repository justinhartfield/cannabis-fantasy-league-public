import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Info, Star, Clock, Calendar } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CategoryData {
  name: string;
  points: number;
  color: string;
}

interface TopPerformer {
  assetName: string;
  assetType: string;
  points: number;
  category: string;
}

interface ScoringEnhancementsProps {
  categories: CategoryData[];
  topPerformers?: TopPerformer[];
  totalPoints: number;
  weekOverWeekChange?: number;
}

/**
 * CategoryBarChart Component
 * Visual comparison of points by category
 */
export function CategoryBarChart({ categories, totalPoints }: { categories: CategoryData[]; totalPoints: number }) {
  const maxPoints = Math.max(...categories.map(c => c.points), 1);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Category Performance
        </CardTitle>
        <CardDescription>Points distribution across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => {
            const percentage = totalPoints > 0 ? (category.points / totalPoints) * 100 : 0;
            const barWidth = (category.points / maxPoints) * 100;
            
            return (
              <div key={category.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                    <span className="font-bold">{category.points.toFixed(0)}</span>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${category.color} transition-all duration-500 ease-out`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * TopPerformersPanel Component
 * Highlights best performing assets
 */
export function TopPerformersPanel({ performers }: { performers: TopPerformer[] }) {
  if (!performers || performers.length === 0) {
    return null;
  }

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case "manufacturer":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cannabis_strain":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "product":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "pharmacy":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "brand":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Top Performers
        </CardTitle>
        <CardDescription>Highest scoring assets this week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {performers.slice(0, 5).map((performer, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                  index === 1 ? 'bg-gray-400/20 text-gray-600' :
                  index === 2 ? 'bg-amber-600/20 text-amber-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{performer.assetName}</p>
                  <Badge variant="outline" className={`text-xs ${getAssetTypeColor(performer.assetType)}`}>
                    {performer.category}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{performer.points.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ScoringFormulaTooltip Component
 * Explains how scoring works
 */
export function ScoringFormulaTooltip({ formula, description }: { formula: string; description: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-muted-foreground cursor-help inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{formula}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * WeekOverWeekIndicator Component
 * Shows trend compared to previous week
 */
export function WeekOverWeekIndicator({ change }: { change?: number }) {
  if (change === undefined || change === null) {
    return null;
  }

  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className={`flex items-center gap-1 text-sm ${
      isPositive ? 'text-green-600' :
      isNeutral ? 'text-muted-foreground' :
      'text-red-600'
    }`}>
      {isPositive ? (
        <TrendingUp className="w-4 h-4" />
      ) : isNeutral ? (
        <span className="w-4 h-4">→</span>
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      <span className="font-medium">
        {isPositive && '+'}{change.toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground">vs last week</span>
    </div>
  );
}

/**
 * PerformanceInsights Component
 * Summary statistics and insights
 */
export function PerformanceInsights({ 
  totalPoints, 
  leagueAverage, 
  rank,
  totalTeams 
}: { 
  totalPoints: number; 
  leagueAverage?: number;
  rank?: number;
  totalTeams?: number;
}) {
  const vsAverage = leagueAverage ? totalPoints - leagueAverage : null;
  const percentile = rank && totalTeams ? ((totalTeams - rank + 1) / totalTeams) * 100 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Performance Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Total Points</p>
            <p className="text-2xl font-bold">{totalPoints.toFixed(1)}</p>
          </div>
          
          {vsAverage !== null && (
            <div className="p-4 rounded-lg bg-muted border border-border">
              <p className="text-sm text-muted-foreground mb-1">vs League Avg</p>
              <p className={`text-2xl font-bold ${
                vsAverage > 0 ? 'text-green-600' : vsAverage < 0 ? 'text-red-600' : ''
              }`}>
                {vsAverage > 0 && '+'}{vsAverage.toFixed(1)}
              </p>
            </div>
          )}
          
          {rank && (
            <div className="p-4 rounded-lg bg-muted border border-border">
              <p className="text-sm text-muted-foreground mb-1">Rank</p>
              <p className="text-2xl font-bold">#{rank}</p>
            </div>
          )}
          
          {percentile !== null && (
            <div className="p-4 rounded-lg bg-muted border border-border">
              <p className="text-sm text-muted-foreground mb-1">Percentile</p>
              <p className="text-2xl font-bold">{percentile.toFixed(0)}th</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * WeekProgressBar Component
 * Shows progress through the current matchup week
 */
export function WeekProgressBar({ year, week }: { year: number; week: number }) {
  // Calculate week start (Monday) and end (Sunday) based on ISO week
  const getWeekDateRange = (y: number, w: number) => {
    const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
    const dow = simple.getUTCDay();
    const isoWeekStart = simple;
    if (dow <= 4)
        isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    else
        isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    
    // Adjust to start of Monday (00:00)
    const start = new Date(isoWeekStart);
    start.setUTCHours(0, 0, 0, 0);
    
    // End of Sunday (23:59:59.999)
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setMilliseconds(-1);
    
    return { start, end };
  };

  const { start, end } = getWeekDateRange(year, week);
  const now = new Date();
  
  // Calculate progress percentage
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  
  // Calculate time remaining
  const timeRemaining = end.getTime() - now.getTime();
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  const isComplete = now > end;
  const isFuture = now < start;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4 text-primary" />
            {isComplete ? "Week Complete" : isFuture ? "Week Starting Soon" : "Week In Progress"}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {isComplete 
              ? "Finalized" 
              : isFuture 
                ? `Starts ${start.toLocaleDateString()}`
                : `${daysRemaining}d ${hoursRemaining}h remaining`
            }
          </div>
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />
          </div>
        </div>
        
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>Mon 00:00</span>
          <span>Sun 23:59</span>
        </div>
      </CardContent>
    </Card>
  );
}
