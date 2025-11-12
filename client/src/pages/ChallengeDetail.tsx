import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Trophy, Users, Calendar, Clock, ArrowLeft, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ChallengeDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  const { user } = useAuth();
  const challengeId = parseInt(id!);

  // Fetch challenge details
  const { data: challenge, isLoading, refetch } = trpc.challenge.getById.useQuery({
    challengeId,
  });

  // Leave challenge mutation
  const leaveChallenge = trpc.challenge.leave.useMutation({
    onSuccess: () => {
      toast.success("You've left the challenge.");
      setLocation("/challenges");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const formatDraftTime = (draftStartTime: string | null) => {
    if (!draftStartTime) return "TBD";
    const date = new Date(draftStartTime);
    return date.toLocaleString();
  };

  const isParticipant = challenge?.participants.some(p => p.userId === user?.id);
  const canDraft = challenge?.status === "drafting" && isParticipant;
  const canViewResults = challenge?.status === "completed";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-xl font-semibold mb-2">Challenge Not Found</h3>
            <Button onClick={() => setLocation("/challenges")} className="mt-4">
              Back to Challenges
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => setLocation("/challenges")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Challenges
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-primary" />
                <CardTitle className="text-3xl">{challenge.name}</CardTitle>
              </div>
              <CardDescription className="text-lg">
                Week {challenge.week}, {challenge.year}
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-1">
              {challenge.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg">
                {challenge.participants.length}/{challenge.maxParticipants} Participants
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg">{challenge.draftRounds} Round Draft</span>
            </div>

            {challenge.draftStartTime && (
              <div className="flex items-center gap-2 md:col-span-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-lg">
                  Draft: {formatDraftTime(challenge.draftStartTime)}
                </span>
              </div>
            )}
          </div>

          {canDraft && (
            <Button
              size="lg"
              className="w-full mb-4"
              onClick={() => setLocation(`/challenge/${challengeId}/draft`)}
            >
              <Play className="w-5 h-5 mr-2" />
              Enter Draft
            </Button>
          )}

          {canViewResults && (
            <Button
              size="lg"
              className="w-full mb-4"
              onClick={() => setLocation(`/challenge/${challengeId}/results`)}
            >
              <Trophy className="w-5 h-5 mr-2" />
              View Results
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>
            {challenge.participants.length} of {challenge.maxParticipants} spots filled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {challenge.participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No participants yet. Be the first to join!
            </div>
          ) : (
            <div className="space-y-2">
              {challenge.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-12 text-center">
                      #{participant.draftPosition}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {participant.username || participant.email}
                        {participant.userId === user?.id && (
                          <Badge variant="secondary" className="ml-2">
                            You
                          </Badge>
                        )}
                      </div>
                      {participant.finalScore !== null && participant.finalScore > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {participant.finalScore} points
                          {participant.finalRank && ` • Rank #${participant.finalRank}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isParticipant && challenge.status === "open" && (
            <>
              <Separator className="my-6" />
              <Button
                variant="destructive"
                onClick={() => leaveChallenge.mutate({ challengeId })}
                disabled={leaveChallenge.isPending}
                className="w-full"
              >
                {leaveChallenge.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  "Leave Challenge"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
