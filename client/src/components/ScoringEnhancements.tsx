     1|import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
     2|import { Badge } from "@/components/ui/badge";
     3|import { TrendingUp, TrendingDown, Trophy, Info, Star, Clock, Calendar } from "lucide-react";
     4|import {
     5|  Tooltip,
     6|  TooltipContent,
     7|  TooltipProvider,
     8|  TooltipTrigger,
     9|} from "@/components/ui/tooltip";
    10|import { Progress } from "@/components/ui/progress";
    11|import { differenceInMinutes, isWithinInterval, format } from "date-fns";
    12|
    13|interface CategoryData {
    14|  name: string;
    15|  points: number;
    16|  color: string;
    17|}
    18|
    19|interface TopPerformer {
    20|  assetName: string;
    21|  assetType: string;
    22|  points: number;
    23|  category: string;
    24|}
    25|
    26|interface ScoringEnhancementsProps {
    27|  categories: CategoryData[];
    28|  topPerformers?: TopPerformer[];
    29|  totalPoints: number;
    30|  weekOverWeekChange?: number;
    31|}
    32|
    33|/**
    34| * WeekProgressBar Component
    35| * Shows current week's progress
    36| */
    37|export function WeekProgressBar({ year, week }: { year: number; week: number }) {
    38|  // Calculate start and end of ISO week
    39|  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    40|  const dayOfWeek = simple.getUTCDay();
    41|  const isoWeekStart = simple;
    42|  if (dayOfWeek <= 4) {
    43|      isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    44|  } else {
    45|      isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    46|  }
    47|  const startDate = isoWeekStart;
    48|  const endDate = new Date(startDate);
    49|  endDate.setUTCDate(endDate.getUTCDate() + 6);
    50|  endDate.setUTCHours(23, 59, 59, 999);
    51|
    52|  const now = new Date();
    53|  const totalDuration = differenceInMinutes(endDate, startDate);
    54|  const elapsed = differenceInMinutes(now, startDate);
    55|  const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    56|
    57|  const isLive = isWithinInterval(now, { start: startDate, end: endDate });
    58|  const isFinished = now > endDate;
    59|
    60|  return (
    61|    <div className="space-y-2">
    62|      <div className="flex items-center justify-between text-xs text-muted-foreground">
    63|        <div className="flex items-center gap-1.5">
    64|          {isLive ? (
    65|            <span className="relative flex h-2 w-2">
    66|              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    67|              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    68|            </span>
    69|          ) : (
    70|            <Clock className="w-3 h-3" />
    71|          )}
    72|          <span className={isLive ? "text-green-500 font-medium" : ""}>
    73|            {isLive ? "Week In Progress" : isFinished ? "Week Completed" : "Scheduled"}
    74|          </span>
    75|        </div>
    76|        <span>{Math.round(percent)}%</span>
    77|      </div>
    78|      <Progress value={percent} className="h-2" />
    79|      <div className="flex justify-between text-[10px] text-muted-foreground/70">
    80|        <span>{format(startDate, "MMM d")}</span>
    81|        <span>{format(endDate, "MMM d")}</span>
    82|      </div>
    83|    </div>
    84|  );
    85|}
    86|
    87|/**
    88| * CategoryBarChart Component
    89| * Visual comparison of points by category
    90| */
    91|export function CategoryBarChart({ categories, totalPoints }: { categories: CategoryData[]; totalPoints: number }) {
    92|  const maxPoints = Math.max(...categories.map(c => c.points), 1);
    93|  
    94|  return (
    95|    <Card>
    96|      <CardHeader>
    97|        <CardTitle className="flex items-center gap-2">
    98|          <Trophy className="w-5 h-5 text-primary" />
    99|          Category Performance
   100|        </CardTitle>
   101|        <CardDescription>Points distribution across categories</CardDescription>
   102|      </CardHeader>
   103|      <CardContent>
   104|        <div className="space-y-4">
   105|          {categories.map((category) => {
   106|            const percentage = totalPoints > 0 ? (category.points / totalPoints) * 100 : 0;
   107|            const barWidth = (category.points / maxPoints) * 100;
   108|            
   109|            return (
   110|              <div key={category.name} className="space-y-2">
   111|                <div className="flex items-center justify-between text-sm">
   112|                  <span className="font-medium">{category.name}</span>
   113|                  <div className="flex items-center gap-2">
   114|                    <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
   115|                    <span className="font-bold">{category.points.toFixed(0)}</span>
   116|                  </div>
   117|                </div>
   118|                <div className="h-3 bg-muted rounded-full overflow-hidden">
   119|                  <div
   120|                    className={`h-full ${category.color} transition-all duration-500 ease-out`}
   121|                    style={{ width: `${barWidth}%` }}
   122|                  />
   123|                </div>
   124|              </div>
   125|            );
   126|          })}
   127|        </div>
   128|      </CardContent>
   129|    </Card>
   130|  );
   131|}
   132|
   133|/**
   134| * TopPerformersPanel Component
   135| * Highlights best performing assets
   136| */
   137|export function TopPerformersPanel({ performers }: { performers: TopPerformer[] }) {
   138|  if (!performers || performers.length === 0) {
   139|    return null;
   140|  }
   141|
   142|  const getAssetTypeColor = (type: string) => {
   143|    switch (type) {
   144|      case "manufacturer":
   145|        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
   146|      case "cannabis_strain":
   147|        return "bg-green-500/10 text-green-600 border-green-500/20";
   148|      case "product":
   149|        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
   150|      case "pharmacy":
   151|        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
   152|      case "brand":
   153|        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
   154|      default:
   155|        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
   156|    }
   157|  };
   158|
   159|  return (
   160|    <Card>
   161|      <CardHeader>
   162|        <CardTitle className="flex items-center gap-2">
   163|          <Star className="w-5 h-5 text-yellow-500" />
   164|          Top Performers
   165|        </CardTitle>
   166|        <CardDescription>Highest scoring assets this week</CardDescription>
   167|      </CardHeader>
   168|      <CardContent>
   169|        <div className="space-y-3">
   170|          {performers.slice(0, 5).map((performer, index) => (
   171|            <div
   172|              key={index}
   173|              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
   174|            >
   175|              <div className="flex items-center gap-3">
   176|                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
   177|                  index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
   178|                  index === 1 ? 'bg-gray-400/20 text-gray-600' :
   179|                  index === 2 ? 'bg-amber-600/20 text-amber-600' :
   180|                  'bg-muted text-muted-foreground'
   181|                }`}>
   182|                  {index + 1}
   183|                </div>
   184|                <div>
   185|                  <p className="font-medium">{performer.assetName}</p>
   186|                  <Badge variant="outline" className={`text-xs ${getAssetTypeColor(performer.assetType)}`}>
   187|                    {performer.category}
   188|                  </Badge>
   189|                </div>
   190|              </div>
   191|              <div className="text-right">
   192|                <p className="text-lg font-bold">{performer.points.toFixed(1)}</p>
   193|                <p className="text-xs text-muted-foreground">points</p>
   194|              </div>
   195|            </div>
   196|          ))}
   197|        </div>
   198|      </CardContent>
   199|    </Card>
   200|  );
   201|}
   202|
   203|/**
   204| * ScoringFormulaTooltip Component
   205| * Explains how scoring works
   206| */
   207|export function ScoringFormulaTooltip({ formula, description }: { formula: string; description: string }) {
   208|  return (
   209|    <TooltipProvider>
   210|      <Tooltip>
   211|        <TooltipTrigger asChild>
   212|          <Info className="w-4 h-4 text-muted-foreground cursor-help inline-block ml-1" />
   213|        </TooltipTrigger>
   214|        <TooltipContent className="max-w-xs">
   215|          <div className="space-y-2">
   216|            <p className="font-semibold">{formula}</p>
   217|            <p className="text-sm text-muted-foreground">{description}</p>
   218|          </div>
   219|        </TooltipContent>
   220|      </Tooltip>
   221|    </TooltipProvider>
   222|  );
   223|}
   224|
   225|/**
   226| * WeekOverWeekIndicator Component
   227| * Shows trend compared to previous week
   228| */
   229|export function WeekOverWeekIndicator({ change }: { change?: number }) {
   230|  if (change === undefined || change === null) {
   231|    return null;
   232|  }
   233|
   234|  const isPositive = change > 0;
   235|  const isNeutral = change === 0;
   236|
   237|  return (
   238|    <div className={`flex items-center gap-1 text-sm ${
   239|      isPositive ? 'text-green-600' :
   240|      isNeutral ? 'text-muted-foreground' :
   241|      'text-red-600'
   242|    }`}>
   243|      {isPositive ? (
   244|        <TrendingUp className="w-4 h-4" />
   245|      ) : isNeutral ? (
   246|        <span className="w-4 h-4">→</span>
   247|      ) : (
   248|        <TrendingDown className="w-4 h-4" />
   249|      )}
   250|      <span className="font-medium">
   251|        {isPositive && '+'}{change.toFixed(1)}%
   252|      </span>
   253|      <span className="text-xs text-muted-foreground">vs last week</span>
   254|    </div>
   255|  );
   256|}
   257|
   258|/**
   259| * PerformanceInsights Component
   260| * Summary statistics and insights
   261| */
   262|export function PerformanceInsights({ 
   263|  totalPoints, 
   264|  leagueAverage, 
   265|  rank,
   266|  totalTeams 
   267|}: { 
   268|  totalPoints: number; 
   269|  leagueAverage?: number;
   270|  rank?: number;
   271|  totalTeams?: number;
   272|}) {
   273|  const vsAverage = leagueAverage ? totalPoints - leagueAverage : null;
   274|  const percentile = rank && totalTeams ? ((totalTeams - rank + 1) / totalTeams) * 100 : null;
   275|
   276|  return (
   277|    <Card>
   278|      <CardHeader>
   279|        <CardTitle className="flex items-center gap-2">
   280|          <TrendingUp className="w-5 h-5 text-primary" />
   281|          Performance Insights
   282|        </CardTitle>
   283|      </CardHeader>
   284|      <CardContent>
   285|        <div className="grid grid-cols-2 gap-4">
   286|          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
   287|            <p className="text-sm text-muted-foreground mb-1">Total Points</p>
   288|            <p className="text-2xl font-bold">{totalPoints.toFixed(1)}</p>
   289|          </div>
   290|          
   291|          {vsAverage !== null && (
   292|            <div className="p-4 rounded-lg bg-muted border border-border">
   293|              <p className="text-sm text-muted-foreground mb-1">vs League Avg</p>
   294|              <p className={`text-2xl font-bold ${
   295|                vsAverage > 0 ? 'text-green-600' : vsAverage < 0 ? 'text-red-600' : ''
   296|              }`}>
   297|                {vsAverage > 0 && '+'}{vsAverage.toFixed(1)}
   298|              </p>
   299|            </div>
   300|          )}
   301|          
   302|          {rank && (
   303|            <div className="p-4 rounded-lg bg-muted border border-border">
   304|              <p className="text-sm text-muted-foreground mb-1">Rank</p>
   305|              <p className="text-2xl font-bold">#{rank}</p>
   306|            </div>
   307|          )}
   308|          
   309|          {percentile !== null && (
   310|            <div className="p-4 rounded-lg bg-muted border border-border">
   311|              <p className="text-sm text-muted-foreground mb-1">Percentile</p>
   312|              <p className="text-2xl font-bold">{percentile.toFixed(0)}th</p>
   313|            </div>
   314|          )}
   315|        </div>
   316|      </CardContent>
   317|    </Card>
   318|  );
   319|}
   320|