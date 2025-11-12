import { useEffect, useState } from "react";
import { Clock, Pause, Play, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DraftClockProps {
  pickNumber: number;
  round: number;
  teamName: string;
  isYourTurn: boolean;
  timeLimit: number; // Total time in seconds
  remainingTime: number; // Remaining time in seconds
  isPaused: boolean;
  onTimerExpired?: () => void;
}

export function DraftClock({
  pickNumber,
  round,
  teamName,
  isYourTurn,
  timeLimit,
  remainingTime,
  isPaused,
  onTimerExpired,
}: DraftClockProps) {
  const [displayTime, setDisplayTime] = useState(remainingTime);

  useEffect(() => {
    setDisplayTime(remainingTime);
  }, [remainingTime]);

  useEffect(() => {
    if (displayTime <= 0 && onTimerExpired) {
      onTimerExpired();
    }
  }, [displayTime, onTimerExpired]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage (inverted - starts at 100% and goes to 0%)
  const progress = (displayTime / timeLimit) * 100;

  // Determine urgency level
  const getUrgencyLevel = () => {
    if (displayTime <= 10) return "critical";
    if (displayTime <= 30) return "warning";
    return "normal";
  };

  const urgency = getUrgencyLevel();

  // Color schemes based on urgency
  const getColorScheme = () => {
    switch (urgency) {
      case "critical":
        return {
          bg: "bg-red-50 dark:bg-red-950/20",
          border: "border-red-500",
          text: "text-red-700 dark:text-red-400",
          progress: "bg-red-500",
          badge: "bg-red-500",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-950/20",
          border: "border-yellow-500",
          text: "text-yellow-700 dark:text-yellow-400",
          progress: "bg-yellow-500",
          badge: "bg-yellow-500",
        };
      default:
        return {
          bg: "bg-green-50 dark:bg-green-950/20",
          border: "border-green-500",
          text: "text-green-700 dark:text-green-400",
          progress: "bg-green-500",
          badge: "bg-green-500",
        };
    }
  };

  const colors = getColorScheme();

  return (
    <Card className={`${colors.bg} border-2 ${colors.border} transition-colors duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className={`h-5 w-5 ${colors.text} ${urgency === "critical" ? "animate-pulse" : ""}`} />
            <span className={colors.text}>Draft Clock</span>
          </CardTitle>
          {isPaused && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Pause className="h-3 w-3" />
              Paused
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Pick Info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Pick #{pickNumber}</p>
            <p className="text-sm text-muted-foreground">Round {round}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{teamName}</p>
            {isYourTurn && (
              <Badge className={`${colors.badge} text-white`}>
                Your Turn!
              </Badge>
            )}
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-6xl font-bold ${colors.text} font-mono ${urgency === "critical" ? "animate-pulse" : ""}`}>
            {formatTime(displayTime)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isPaused ? "Timer Paused" : "Time Remaining"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className="h-3"
            indicatorClassName={colors.progress}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0:00</span>
            <span>{formatTime(timeLimit)}</span>
          </div>
        </div>

        {/* Urgency Warning */}
        {urgency === "critical" && (
          <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-md border border-red-300 dark:border-red-700">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Time running out! Make your pick now or auto-pick will trigger.
            </p>
          </div>
        )}

        {urgency === "warning" && (
          <div className="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md border border-yellow-300 dark:border-yellow-700">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
              Less than 30 seconds remaining!
            </p>
          </div>
        )}

        {/* Auto-pick Notice */}
        {!isYourTurn && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Waiting for {teamName} to make their pick...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
