import { useState } from "react";
import { trpc } from "../_core/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Loader2, Mail, Send, RefreshCw, X, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Invite Members Component
 * 
 * Allows league commissioners to invite new members via email
 * Shows pending, accepted, and declined invitations
 */

interface InviteMembersProps {
  leagueId: number;
  leagueName: string;
}

export default function InviteMembers({ leagueId, leagueName }: InviteMembersProps) {
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  const { data: invitations, refetch } = trpc.invitation.getLeagueInvitations.useQuery({
    leagueId,
  });

  const sendInvitation = trpc.invitation.sendInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation sent!');
      setEmail('');
      setRecipientName('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendInvitation = trpc.invitation.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation resent!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelInvitation = trpc.invitation.cancelInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation cancelled');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSendInvitation = () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    sendInvitation.mutate({
      leagueId,
      email: email.trim(),
      recipientName: recipientName.trim() || undefined,
    });
  };

  const handleResend = (invitationId: number) => {
    resendInvitation.mutate({ invitationId });
  };

  const handleCancel = (invitationId: number) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      cancelInvitation.mutate({ invitationId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Declined
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invite Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Send Invitation Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Recipient Name (Optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSendInvitation}
            disabled={sendInvitation.isLoading}
            className="w-full"
          >
            {sendInvitation.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Invitation
          </Button>
        </div>

        {/* Invitations List */}
        {invitations && invitations.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Sent Invitations</h3>
            <div className="space-y-2">
              {invitations.map((invitation: any) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{invitation.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Sent {new Date(invitation.createdAt).toLocaleDateString()}
                      {invitation.status === 'pending' && invitation.expiresAt && (
                        <> • Expires {new Date(invitation.expiresAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invitation.status)}
                    {invitation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(invitation.id)}
                          disabled={resendInvitation.isLoading}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(invitation.id)}
                          disabled={cancelInvitation.isLoading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
