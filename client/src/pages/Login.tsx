import { useState } from 'react';
import { useLocation } from 'wouter';
import { APP_LOGO, APP_TITLE } from '@/const';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';

/**
 * Login Page - Weed.de 2026 Reskin
 * 
 * Bold, welcoming login experience with Weed.de branding
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      
      // Redirect to the page they were trying to access, or home
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/';
      setLocation(redirectTo);
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-weed-cream dark:bg-weed-burgundy pattern-dots p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-weed-purple rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-4 ring-weed-green"
                />
                <div className="absolute -bottom-2 -right-2 bg-weed-green rounded-full p-2 shadow-lg">
                  <Leaf className="h-6 w-6 text-black" />
                </div>
              </div>
            </div>
            <h1 className="headline-primary text-4xl text-weed-coral">
              {APP_TITLE}
            </h1>
            <p className="body-text text-muted-foreground dark:text-white/70">
              Welcome back! Sign in to continue your journey.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-semibold text-foreground dark:text-white mb-2 uppercase tracking-wide"
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
              className="w-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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

          {/* Dev Note */}
          <div className="p-4 bg-weed-green/10 border-2 border-weed-green/30 rounded-lg">
            <p className="text-xs text-weed-burgundy dark:text-weed-green font-medium">
              <strong className="uppercase tracking-wide">Development Mode:</strong> Enter any username to create a test account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-muted-foreground dark:text-white/60 text-sm">
          <p className="font-medium">First fantasy league for medical cannabis in Germany 🇩🇪</p>
        </div>
      </div>
    </div>
  );
}
