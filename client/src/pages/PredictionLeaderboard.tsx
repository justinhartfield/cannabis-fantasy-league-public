import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Trophy, Medal, Award } from "lucide-react";

export default function PredictionLeaderboard() {
  const { data, isLoading } = trpc.prediction.getLeaderboard.useQuery({ limit: 50 });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-muted-foreground">Top prediction streak champions</p>
          </div>
        </div>
      </header>

      {/* Current User Rank */}
      {data?.currentUserRank && (
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <p className="text-center text-sm">
            Your current rank: <span className="font-bold text-lg">#{data.currentUserRank}</span>
          </p>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Current Streak</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Best Streak</th>
              </tr>
            </thead>
            <tbody>
              {data?.leaderboard.map((user) => (
                <tr
                  key={user.id}
                  className={`border-t border-border ${
                    user.isCurrentUser ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                      {user.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                      {user.rank === 3 && <Award className="w-5 h-5 text-orange-600" />}
                      <span className={`font-bold ${user.rank <= 3 ? 'text-lg' : ''}`}>
                        #{user.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={user.isCurrentUser ? 'font-bold' : ''}>
                      {user.name}
                      {user.isCurrentUser && (
                        <span className="ml-2 text-xs text-primary">(You)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold">
                      {user.currentStreak > 0 ? `${user.currentStreak} 🔥` : user.currentStreak}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-primary">{user.longestStreak}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
