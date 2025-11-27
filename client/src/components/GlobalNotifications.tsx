import { useCallback } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/hooks/useWebSocket';

/**
 * GlobalNotifications - Listens for user-level WebSocket notifications
 * 
 * This component maintains a WebSocket connection that receives notifications
 * sent directly to the user (not to a specific league channel). This ensures
 * users get notified about events like "opponent joined your challenge" even
 * when they're browsing other pages.
 * 
 * Key events handled:
 * - opponent_joined_your_challenge: When someone joins a challenge you created
 * - challenge_coin_flip_result: When the coin flip completes for your challenge
 */
export function GlobalNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: any) => {
    // Skip if we're already on the relevant challenge page
    const isOnChallengePage = location.includes(`/challenge/${message.challengeId}`);
    
    if (message.type === 'opponent_joined_your_challenge') {
      // Show rich notification with action button
      toast.success(
        <div className="flex flex-col gap-2">
          <div className="font-semibold flex items-center gap-2">
            <span>🎮</span>
            <span>{message.opponentTeamName || 'Your opponent'} joined!</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {message.challengeName ? `Challenge: ${message.challengeName}` : 'The coin flip is starting!'}
          </div>
          {!isOnChallengePage && (
            <Button
              size="sm"
              className="mt-2 gradient-primary w-full"
              onClick={() => {
                setLocation(`/challenge/${message.challengeId}/draft`);
                toast.dismiss(`challenge-ready-${message.challengeId}`);
              }}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Join Draft
            </Button>
          )}
        </div>,
        {
          duration: 30000, // Keep visible for 30 seconds
          id: `challenge-ready-${message.challengeId}`,
        }
      );
    } else if (message.type === 'challenge_coin_flip_result') {
      // Only show if not already on the draft page
      if (!location.includes(`/challenge/${message.challengeId}/draft`)) {
        toast.info(
          <div className="flex flex-col gap-2">
            <div className="font-semibold flex items-center gap-2">
              <span>🎲</span>
              <span>Coin flip complete!</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-primary">{message.winnerTeamName}</span> picks first. Draft starting now!
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                setLocation(`/challenge/${message.challengeId}/draft`);
                toast.dismiss(`coin-flip-${message.challengeId}`);
              }}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Go to Draft
            </Button>
          </div>,
          {
            duration: 20000,
            id: `coin-flip-${message.challengeId}`,
          }
        );
      }
    }
  }, [setLocation, location]);

  // Connect to WebSocket with just userId (no leagueId = user-level channel)
  useWebSocket({
    userId: user?.id || 0,
    // No leagueId - this subscribes to user's personal channel
    onMessage: handleMessage,
    autoConnect: isAuthenticated && !!user?.id,
  });

  // This component doesn't render anything visible
  return null;
}

