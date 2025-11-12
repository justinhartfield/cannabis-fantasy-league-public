import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Trophy, CheckCircle, XCircle } from "@/lib/icons";
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
      setLocation(`/leagues/${data.leagueId}`);
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
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
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
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invitation Error</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl">You're Invited!</CardTitle>
          <p className="text-muted-foreground mt-2">
            Join <strong>{invitation?.leagueName}</strong>
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Invited by:</span>
              <span className="font-medium">{invitation?.inviterName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">League:</span>
              <span className="font-medium">{invitation?.leagueName}</span>
            </div>
          </div>

          {/* Team Name Input */}
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name *</Label>
            <Input
              id="teamName"
              placeholder="Enter your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Choose a unique name for your team
            </p>
          </div>

          {/* New User Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="newUser"
                checked={isNewUser}
                onChange={(e) => setIsNewUser(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="newUser" className="cursor-pointer">
                I'm a new user (create account)
              </Label>
            </div>

            {isNewUser && (
              <div className="space-y-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    minLength={3}
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
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
            <div className="text-sm text-muted-foreground text-center">
              This invitation expires on{' '}
              {new Date(invitation.expiresAt).toLocaleDateString()}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-4">
          <Button
            onClick={handleDecline}
            variant="outline"
            className="flex-1"
            disabled={declineMutation.isLoading}
          >
            {declineMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1"
            disabled={acceptMutation.isLoading}
          >
            {acceptMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept & Join League
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
