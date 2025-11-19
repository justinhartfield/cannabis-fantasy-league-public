import { APP_LOGO, APP_TITLE } from '@/const';
import { Leaf } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';

/**
 * Login Page - Clerk Authentication
 * 
 * Uses Clerk's SignIn component for authentication
 */
export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-weed-cream dark:bg-weed-burgundy pattern-dots p-4 relative">
      {/* Floating Wayfinder Characters */}
      <img src="https://framerusercontent.com/images/NbcObVXzQHvPqgg7j0Lqz8Oc.gif" alt="Wayfinder" className="absolute top-10 left-10 w-24 h-24 opacity-80 hidden md:block" />
      <img src="https://framerusercontent.com/images/PZMqPnSPRfHqoqnWJwL4sDKY.gif" alt="Wayfinder" className="absolute bottom-10 right-10 w-24 h-24 opacity-80 hidden md:block" />
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

          {/* Clerk SignIn Component */}
          <div className="flex justify-center">
            <SignIn 
              routing="path"
              path="/login"
              signUpUrl="/sign-up"
              afterSignInUrl="/"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none bg-transparent",
                }
              }}
            />
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
