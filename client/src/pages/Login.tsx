import { useState } from 'react';
import { useLocation } from 'wouter';
import { APP_LOGO, APP_TITLE } from '@/const';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';
import { trpc } from '@/lib/trpc';

/**
 * Login Page - Weed.de 2026 Reskin with Wayfinder Illustrations
 * 
 * Bold, playful login experience featuring Wayfinder character illustrations
 * and Weed.de brand colors, typography, and design patterns.
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const utils = trpc.useUtils();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call mock login endpoint
      const response = await fetch('/api/auth/mock-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Invalidate the auth.me query to force a refetch with the new cookie
      await utils.auth.me.invalidate();
      
      // Small delay to ensure the cookie is set and query is invalidated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to the page they were trying to access, or home
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/';
      setLocation(redirectTo);
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-weed-cream dark:bg-weed-burgundy pattern-dots p-4 relative overflow-hidden">
      {/* Floating Wayfinder Characters - Background Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Left - World Character */}
        <img
          src="/assets/illustrations/World_Sticker_Alpha.gif"
          alt=""
          className="absolute top-8 left-8 w-24 h-24 md:w-32 md:h-32 opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: '0s', animationDuration: '6s' }}
        />
        
        {/* Top Right - Ice Cream Character */}
        <img
          src="/assets/illustrations/Ice-Cream_Sticker_Alpha.gif"
          alt=""
          className="absolute top-12 right-12 w-20 h-20 md:w-28 md:h-28 opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: '1s', animationDuration: '7s' }}
        />
        
        {/* Bottom Left - Pancake Character */}
        <img
          src="/assets/illustrations/Pancake_Sticker_Alpha.gif"
          alt=""
          className="absolute bottom-16 left-16 w-24 h-24 md:w-32 md:h-32 opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: '2s', animationDuration: '8s' }}
        />
        
        {/* Bottom Right - Pillow Character */}
        <img
          src="/assets/illustrations/Pillow_Sticker_Alpha.gif"
          alt=""
          className="absolute bottom-12 right-8 w-20 h-20 md:w-28 md:h-28 opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: '1.5s', animationDuration: '7.5s' }}
        />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white dark:bg-weed-purple rounded-2xl shadow-2xl p-8 space-y-8 slide-in-bottom">
          {/* Logo and Title Section */}
          <div className="text-center space-y-6">
            {/* Featured Wayfinder Character - Rotates on hover */}
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <img
                  src="/assets/illustrations/World_Sticker_Alpha.gif"
                  alt="Wayfinder Character"
                  className="h-32 w-32 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                />
              </div>
            </div>

            {/* App Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-weed-green"
                />
                <div className="absolute -bottom-2 -right-2 bg-weed-green rounded-full p-2 shadow-lg">
                  <Leaf className="h-5 w-5 text-black" />
                </div>
              </div>
            </div>

            {/* Title and Tagline */}
            <div>
              <h1 className="headline-primary text-4xl md:text-5xl text-weed-coral mb-2">
                {APP_TITLE}
              </h1>
              <div className="inline-block bg-weed-green px-4 py-1 rounded-full">
                <p className="text-sm font-bold text-black uppercase tracking-wide">
                  Find Your Way
                </p>
              </div>
            </div>

            <p className="body-text text-muted-foreground dark:text-white/70 text-lg">
              Welcome back! Sign in to continue your journey.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-bold text-foreground dark:text-white mb-2 uppercase tracking-wide"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-background dark:bg-weed-burgundy border-2 border-input dark:border-white/20 rounded-lg text-foreground dark:text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-weed-green focus:border-transparent transition-all"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-3 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full text-base font-bold uppercase tracking-wide"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Dev Note with Wayfinder Character */}
          <div className="relative p-4 bg-weed-green/10 border-2 border-weed-green/30 rounded-lg">
            <div className="flex items-start gap-3">
              <img
                src="/assets/illustrations/Pillow_Sticker_Alpha.gif"
                alt=""
                className="h-12 w-12 flex-shrink-0"
              />
              <p className="text-xs text-weed-burgundy dark:text-weed-green font-medium pt-2">
                <strong className="uppercase tracking-wide block mb-1">Development Mode:</strong>
                Enter any username to create a test account.
              </p>
            </div>
          </div>
        </div>

        {/* Footer with Character Accent */}
        <div className="text-center mt-6 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/assets/illustrations/Ice-Cream_Sticker_Alpha.gif"
              alt=""
              className="h-8 w-8"
            />
            <p className="font-bold text-foreground dark:text-white text-sm">
              First fantasy league for medical cannabis in Germany 🇩🇪
            </p>
            <img
              src="/assets/illustrations/Pancake_Sticker_Alpha.gif"
              alt=""
              className="h-8 w-8"
            />
          </div>
        </div>
      </div>

      {/* Floating Animation Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-5deg);
          }
          75% {
            transform: translateY(-15px) rotate(3deg);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
