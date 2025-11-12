import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trophy, Users, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ChallengeList() {
  const [, setLocation] = useLocation();
  
  const [selectedStatus, setSelectedStatus] = useState<"all" | "open" | "drafting" | "active" | "completed">("all");

  // Get current week and year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = Math.ceil((now.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

  // Fetch challenges
  const { data: challenges, isLoading, refetch } = trpc.challenge.list.useQuery({
    status: selectedStatus,
  });

  // Join challenge mutation
  const joinChallenge = trpc.challenge.join.useMutation({
    onSuccess: (data, variables) => {
      toast.success("You've successfully joined the challenge. Good luck!");
      refetch();
      setLocation(`/challenge/${variables.challengeId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      drafting: "secondary",
      active: "outline",
      completed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const formatDraftTime = (draftStartTime: string | null) => {
    if (!draftStartTime) return "TBD";
    const date = new Date(draftStartTime);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return "Started";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Daily Challenges</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Quick-play fantasy competitions. Draft a roster, compete for a week, win prizes!
        </p>
      </div>

      <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="drafting">Drafting</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {!challenges || challenges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Challenges Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are no challenges available right now. Check back soon or create your own!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => (
            <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl">{challenge.name}</CardTitle>
                  {getStatusBadge(challenge.status)}
                </div>
                <CardDescription>
                  Week {challenge.week}, {challenge.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {challenge.participantCount}/{challenge.maxParticipants} participants
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <span>{challenge.draftRounds} round draft</span>
                  </div>

                  {challenge.draftStartTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Draft: {formatDraftTime(challenge.draftStartTime)}</span>
                    </div>
                  )}

                  <div className="pt-3">
                    {challenge.status === "open" && (
                      <Button
                        className="w-full"
                        onClick={() => joinChallenge.mutate({ challengeId: challenge.id })}
                        disabled={
                          joinChallenge.isPending ||
                          challenge.participantCount >= challenge.maxParticipants
                        }
                      >
                        {joinChallenge.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : challenge.participantCount >= challenge.maxParticipants ? (
                          "Full"
                        ) : (
                          "Join Challenge"
                        )}
                      </Button>
                    )}

                    {challenge.status !== "open" && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setLocation(`/challenge/${challenge.id}`)}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
