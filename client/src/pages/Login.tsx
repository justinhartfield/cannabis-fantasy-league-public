import { APP_LOGO, APP_TITLE } from "@/const";
import { Flame, Leaf, Trophy, Zap } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";

/**
 * Login Page - Clerk Authentication
 * 
 * Cannabis Fantasy League themed login with vibrant design
 */
export default function Login() {
  const footerCopy = `© ${new Date().getFullYear()} ${APP_TITLE}. First fantasy league for medical cannabis in Germany 🇩🇪`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d0f] via-[#1c1b22] to-[#0d0d0f] p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pattern-dots opacity-20" />
      <div className="absolute top-20 right-20 w-64 h-64 bg-weed-green/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-weed-coral/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Floating Icons */}
      <div className="absolute top-10 left-10 opacity-20 hidden md:block">
        <Leaf className="h-16 w-16 text-weed-green animate-bounce" style={{ animationDuration: '3s' }} />
      </div>
      <div className="absolute top-20 right-32 opacity-20 hidden md:block">
        <Trophy className="h-12 w-12 text-weed-coral animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
      </div>
      <div className="absolute bottom-32 right-20 opacity-20 hidden md:block">
        <Flame className="h-14 w-14 text-weed-pink animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
      </div>
      <div className="absolute bottom-20 left-32 opacity-20 hidden md:block">
        <Zap className="h-10 w-10 text-weed-green animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }} />
      </div>

      <div className="relative flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="rounded-[32px] bg-gradient-to-br from-[#1f1b2e] to-[#2d1f33] p-8 shadow-[0_25px_75px_rgba(0,0,0,0.45)] backdrop-blur-xl border border-white/10 space-y-8">
            {/* Logo and Branding */}
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-weed-green to-weed-coral rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition"></div>
                  <div className="relative">
                    <img
                      src={APP_LOGO}
                      alt={APP_TITLE}
                      className="h-24 w-24 rounded-3xl object-cover shadow-2xl ring-4 ring-weed-green"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-weed-green rounded-full p-2 shadow-lg animate-pulse">
                      <Leaf className="h-6 w-6 text-black" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h1 className="headline-primary text-4xl text-white">
                  {APP_TITLE}
                </h1>
                <p className="text-sm text-white/60 uppercase tracking-[0.4em]">
                  Germany's #1 Cannabis League
                </p>
                <p className="body-text text-white/70 max-w-sm mx-auto">
                  Welcome back! Sign in to continue your journey.
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-weed-green/20 to-transparent border border-weed-green/30 p-3 text-center">
                <Trophy className="h-6 w-6 text-weed-green mx-auto mb-1" />
                <p className="text-xs text-white/70 font-semibold">Compete</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-weed-coral/20 to-transparent border border-weed-coral/30 p-3 text-center">
                <Flame className="h-6 w-6 text-weed-coral mx-auto mb-1" />
                <p className="text-xs text-white/70 font-semibold">Streak</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 p-3 text-center">
                <Zap className="h-6 w-6 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-white/70 font-semibold">Win</p>
              </div>
            </div>

            {/* Clerk SignIn Component */}
            <div className="flex justify-center">
              <SignIn 
                routing="hash"
                signUpUrl="/sign-up"
                afterSignInUrl="/"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none bg-transparent",
                    formButtonPrimary: "bg-weed-green hover:bg-weed-green/80 text-black font-semibold",
                    formFieldInput: "bg-black/40 border-white/10 text-white focus:ring-weed-green",
                    footerActionLink: "text-weed-green hover:text-weed-green/80",
                    identityPreviewText: "text-white",
                    formFieldLabel: "text-white/80",
                    dividerLine: "bg-white/10",
                    dividerText: "text-white/50",
                    socialButtonsBlockButton: "bg-black/40 border-white/10 text-white hover:bg-black/60",
                    socialButtonsBlockButtonText: "text-white font-medium",
                    formFieldInputShowPasswordButton: "text-white/60 hover:text-white",
                    otpCodeFieldInput: "bg-black/40 border-white/10 text-white",
                    formResendCodeLink: "text-weed-green hover:text-weed-green/80",
                    headerTitle: "text-white",
                    headerSubtitle: "text-white/70",
                  }
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 space-y-3">
            <p className="text-white/40 text-sm font-medium">{footerCopy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
