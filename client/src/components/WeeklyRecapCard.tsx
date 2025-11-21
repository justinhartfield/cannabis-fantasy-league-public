import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Flame, Skull, Send } from "lucide-react";
import { SocialShare } from "./SocialShare";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WeeklyRecapCardProps {
  leagueId: number;
  year: number;
  week: number;
  isCommissioner: boolean;
}

export function WeeklyRecapCard({ leagueId, year, week, isCommissioner }: WeeklyRecapCardProps) {
  const { data: recap, isLoading, error } = trpc.recap.getWeeklyRecap.useQuery({
    leagueId,
    year,
    week,
  });

  const sendEmailMutation = trpc.recap.sendRecapEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Recap emailed to ${data.sentCount} members!`);
      } else {
        toast.error(data.message || "Failed to send email.");
      }
    },
    onError: () => {
      toast.error("Failed to send email.");
    }
  });

  if (isLoading) return <Skeleton className="w-full h-64" />;
  if (error) return null; // Hide if no data (e.g., week hasn't started)
  if (!recap) return null;

  const handleEmailRecap = () => {
    sendEmailMutation.mutate({ leagueId, year, week });
  };

  return (
    <Card className="w-full bg-gradient-to-br from-card to-muted/50 border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Week {week} Recap
            </CardTitle>
            <CardDescription>Highlights from {recap.leagueName}</CardDescription>
          </div>
          <SocialShare 
            title={`Week ${week} Recap - ${recap.leagueName}`}
            text={`High Score: ${recap.highestScore?.totalPoints ?? 0} pts by ${recap.highestScore?.teamName}`}
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {/* High Score */}
        {recap.highestScore && (
          <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg border border-border/50">
            <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
            <h3 className="font-semibold text-sm text-muted-foreground">High Scorer</h3>
            <div className="flex items-center gap-2 mt-1">
               <Avatar className="w-6 h-6">
                  <AvatarImage src={recap.highestScore.avatarUrl || undefined} />
                  <AvatarFallback>{recap.highestScore.teamName[0]}</AvatarFallback>
                </Avatar>
                <span className="font-bold">{recap.highestScore.teamName}</span>
            </div>
            <span className="text-2xl font-bold text-primary mt-1">{recap.highestScore.totalPoints} pts</span>
          </div>
        )}

        {/* Close Call */}
        {recap.closeCall && (
          <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg border border-border/50">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-2 text-blue-500 font-bold">VS</div>
            <h3 className="font-semibold text-sm text-muted-foreground">Nail Biter</h3>
            <span className="text-xs text-muted-foreground mb-1">Margin: {recap.closeCall.margin} pts</span>
            <div className="text-center">
              <div className="font-medium text-sm">{recap.closeCall.winner.teamName}</div>
              <div className="text-xs text-muted-foreground">def.</div>
              <div className="font-medium text-sm">{recap.closeCall.loser.teamName}</div>
            </div>
          </div>
        )}

        {/* Blowout */}
        {recap.blowout && (
          <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg border border-border/50">
            <Skull className="w-8 h-8 text-red-500 mb-2" />
            <h3 className="font-semibold text-sm text-muted-foreground">Total Destruction</h3>
            <span className="text-xs text-muted-foreground mb-1">Margin: {recap.blowout.margin} pts</span>
            <div className="text-center">
                <div className="font-medium text-sm">{recap.blowout.winner.teamName}</div>
                <div className="text-xs text-muted-foreground">crushed</div>
                <div className="font-medium text-sm">{recap.blowout.loser.teamName}</div>
            </div>
          </div>
        )}
      </CardContent>
      
      {isCommissioner && (
        <CardFooter className="justify-end border-t border-border/50 pt-4">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleEmailRecap}
            disabled={sendEmailMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sendEmailMutation.isPending ? "Sending..." : "Email Report to League"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}


