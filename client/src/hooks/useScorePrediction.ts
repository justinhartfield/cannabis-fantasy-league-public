import { useState, useEffect, useRef } from 'react';

/**
 * useScorePrediction Hook
 * 
 * Provides smooth score interpolation between real updates for a live sports feel.
 * When isLive is true, the displayed score smoothly animates toward the target score.
 * When isLive is false, the score snaps immediately to the current value.
 * 
 * @param currentScore - The actual score from the server
 * @param isLive - Whether the game is currently live (enables smooth animation)
 * @param easeSpeed - How fast to ease toward the target (0.1 = slow, 0.3 = fast)
 * @returns The interpolated display score
 */
export function useScorePrediction(
  currentScore: number,
  isLive: boolean,
  easeSpeed: number = 0.15
): number {
  const [displayScore, setDisplayScore] = useState(currentScore);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  useEffect(() => {
    // If not live, snap immediately to current score
    if (!isLive) {
      setDisplayScore(currentScore);
      return;
    }
    
    // Animation loop for smooth easing
    const animate = (timestamp: number) => {
      // Limit updates to ~60fps
      if (timestamp - lastTimeRef.current < 16) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTimeRef.current = timestamp;
      
      setDisplayScore(prev => {
        const diff = currentScore - prev;
        
        // If close enough, snap to target
        if (Math.abs(diff) < 0.05) {
          return currentScore;
        }
        
        // Ease toward target
        return prev + diff * easeSpeed;
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentScore, isLive, easeSpeed]);
  
  // Round to 1 decimal place for display
  return Math.round(displayScore * 10) / 10;
}

/**
 * useScoreVelocity Hook
 * 
 * Tracks the rate of score changes over time to enable predictive scoring.
 * Can be used alongside useScorePrediction for even smoother transitions.
 * 
 * @param currentScore - The actual score from the server
 * @param windowMs - Time window for calculating velocity (default 60 seconds)
 * @returns Object with velocity (points per second) and trend direction
 */
export function useScoreVelocity(
  currentScore: number,
  windowMs: number = 60000
): { velocity: number; trend: 'up' | 'down' | 'stable' } {
  const [velocity, setVelocity] = useState(0);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const historyRef = useRef<Array<{ score: number; time: number }>>([]);
  
  useEffect(() => {
    const now = Date.now();
    
    // Add current score to history
    historyRef.current.push({ score: currentScore, time: now });
    
    // Remove old entries outside the window
    historyRef.current = historyRef.current.filter(
      entry => now - entry.time < windowMs
    );
    
    // Calculate velocity if we have enough history
    if (historyRef.current.length >= 2) {
      const oldest = historyRef.current[0];
      const newest = historyRef.current[historyRef.current.length - 1];
      const timeDeltaSeconds = (newest.time - oldest.time) / 1000;
      
      if (timeDeltaSeconds > 0) {
        const scoreDelta = newest.score - oldest.score;
        const newVelocity = scoreDelta / timeDeltaSeconds;
        setVelocity(newVelocity);
        
        // Determine trend
        if (newVelocity > 0.01) {
          setTrend('up');
        } else if (newVelocity < -0.01) {
          setTrend('down');
        } else {
          setTrend('stable');
        }
      }
    }
  }, [currentScore, windowMs]);
  
  return { velocity, trend };
}

