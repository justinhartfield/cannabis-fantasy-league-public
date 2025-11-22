import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Trophy, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Accept Invitation Page
 * 
 * Allows users to accept league invitations via email link
 * Handles both existing and new user registration
 */

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get('token');

  const [teamName, setTeamName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  const { data: invitation, isLoading, error } = trpc.invitation.getByToken.useQuery(
    { token: token || '' },
    { enabled: !!token }
  );

  const acceptMutation = trpc.invitation.acceptInvitation.useMutation({
    onSuccess: (data) => {
      toast.success('Successfully joined the league!');
      const path = data.leagueType === 'challenge'
        ? `/challenge/${data.leagueId}`
        : `/league/${data.leagueId}`;
      setLocation(path);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const declineMutation = trpc.invitation.declineInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation declined');
      setLocation('/');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAccept = () => {
    if (!token) return;
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    if (isNewUser) {
      if (!username.trim() || !password.trim()) {
        toast.error('Please enter username and password');
        return;
      }
      acceptMutation.mutate({
        token,
        teamName,
        username,
        password,
      });
    } else {
      acceptMutation.mutate({
        token,
        teamName,
      });
    }
  };

  const handleDecline = () => {
    if (!token) return;
    if (confirm('Are you sure you want to decline this invitation?')) {
      declineMutation.mutate({ token });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-destructive/30 shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-destructive/10 mx-auto flex items-center justify-center mb-6">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2 headline-primary text-destructive">Invalid Invitation</h2>
            <p className="text-muted-foreground">
              This invitation link is invalid or incomplete.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-weed-green mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-destructive/30 shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-destructive/10 mx-auto flex items-center justify-center mb-6">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2 headline-primary text-destructive">Invitation Error</h2>
            <p className="text-muted-foreground mb-6">{error.message}</p>
            <Button onClick={() => setLocation('/')} variant="outline">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-weed-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2 border-weed-green shadow-2xl overflow-hidden">
        <div className="bg-weed-coral p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-4 backdrop-blur-sm shadow-lg transform rotate-3">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-4xl headline-primary text-white mb-2 drop-shadow-md">YOU'RE INVITED!</CardTitle>
            <p className="text-white/90 font-medium text-lg">
              Join <strong className="text-white underline decoration-weed-green decoration-4 underline-offset-4">{invitation?.leagueName}</strong>
            </p>
          </div>
        </div>

        <CardContent className="p-8 space-y-6 bg-white">
          {/* Invitation Details */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-weed-green/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Invited by</p>
                  <p className="font-bold text-lg">{invitation?.inviterName}</p>
                </div>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-weed-purple/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-weed-purple" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">League</p>
                  <p className="font-bold text-lg">{invitation?.leagueName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Name Input */}
          <div className="space-y-3">
            <Label htmlFor="teamName" className="text-base font-bold uppercase tracking-wide text-gray-700">Team Name <span className="text-weed-coral">*</span></Label>
            <Input
              id="teamName"
              placeholder="ENTER YOUR TEAM NAME"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={50}
              className="h-12 text-lg border-2 border-gray-200 focus:border-weed-green focus:ring-weed-green rounded-lg"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-weed-green" /> Choose a unique name for your team
            </p>
          </div>

          {/* New User Section */}
          <div className="border-t border-dashed border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <input
                type="checkbox"
                id="newUser"
                checked={isNewUser}
                onChange={(e) => setIsNewUser(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-weed-green focus:ring-weed-green cursor-pointer"
              />
              <Label htmlFor="newUser" className="cursor-pointer font-bold text-gray-700 select-none">
                I'm a new user (create account)
              </Label>
            </div>

            {isNewUser && (
              <div className="space-y-5 pl-2 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="username" className="font-bold text-gray-700">Username <span className="text-weed-coral">*</span></Label>
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    minLength={3}
                    maxLength={30}
                    className="h-11 border-gray-200 focus:border-weed-green"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold text-gray-700">Password <span className="text-weed-coral">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="h-11 border-gray-200 focus:border-weed-green"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expiration Notice */}
          {invitation?.expiresAt && (
            <div className="text-xs text-center py-2 px-4 bg-yellow-50 text-yellow-800 rounded-full font-medium inline-block w-full">
              ⚠️ Invitation expires {new Date(invitation.expiresAt).toLocaleDateString()}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-4 p-8 pt-0 bg-white">
          <Button
            onClick={handleDecline}
            variant="outline"
            className="flex-1 h-12 border-2 border-gray-200 hover:bg-gray-50 hover:text-red-600 font-bold uppercase tracking-wide"
            disabled={declineMutation.isLoading}
          >
            {declineMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 h-12 bg-weed-green hover:bg-weed-green/90 text-black font-bold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            disabled={acceptMutation.isLoading}
          >
            {acceptMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept & Join
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}