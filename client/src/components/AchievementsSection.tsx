import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementBadge } from "./AchievementBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";

export function AchievementsSection() {
  const { data: achievements, isLoading } = trpc.achievement.getMine.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="flex gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Achievements
        </CardTitle>
        <CardDescription>Badges earned from your league dominance</CardDescription>
      </CardHeader>
      <CardContent>
        {achievements && achievements.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                type={achievement.achievementType}
                name={achievement.achievementName}
                description={achievement.description || ""}
                earnedAt={achievement.earnedAt}
                iconUrl={achievement.iconUrl || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No achievements yet. Go win some matchups!
          </div>
        )}
      </CardContent>
    </Card>
  );
}


