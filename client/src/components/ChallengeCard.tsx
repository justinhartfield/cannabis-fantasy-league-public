import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, Calendar } from "lucide-react";

interface ChallengeCardProps {
  challenge: {
    id: number;
    name: string;
    status: string;
    year: number;
    week: number;
    maxParticipants: number;
    participantCount: number;
    draftRounds: number;
    draftStartTime: string | null;
  };
  onJoin?: (challengeId: number) => void;
  isJoining?: boolean;
}

export function ChallengeCard({ challenge, onJoin, isJoining }: ChallengeCardProps) {
  const [, setLocation] = useLocation();

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

  return (
    <Card className="hover:shadow-lg transition-shadow">
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
            {challenge.status === "open" && onJoin ? (
              <Button
                className="w-full"
                onClick={() => onJoin(challenge.id)}
                disabled={
                  isJoining ||
                  challenge.participantCount >= challenge.maxParticipants
                }
              >
                {isJoining ? "Joining..." : challenge.participantCount >= challenge.maxParticipants ? "Full" : "Join Challenge"}
              </Button>
            ) : (
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
  );
}
