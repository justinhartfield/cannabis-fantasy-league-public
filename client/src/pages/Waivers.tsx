import { useState } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const statusVariants: Record<string, "default" | "destructive" | "secondary"> = {
  pending: "secondary",
  success: "default",
  failed: "destructive",
  error: "destructive",
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Waivers() {
  const { id } = useParams();
  const leagueId = parseInt(id!);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("claims");

  // Fetch league details
  const { data: league } = trpc.league.getById.useQuery({ leagueId });

  // Fetch user's team
  const { data: myTeam } = trpc.league.getMyTeam.useQuery({ leagueId });

  const {
    data: claims = [],
    isLoading: claimsLoading,
    refetch: refetchClaims,
  } = trpc.waiver.getClaims.useQuery({ leagueId }, { enabled: !!leagueId });

  const {
    data: transactionLog = [],
    isLoading: logLoading,
    refetch: refetchLog,
  } = trpc.waiver.getTransactionLog.useQuery({ leagueId }, { enabled: !!leagueId });

  const cancelClaim = trpc.waiver.cancelClaim.useMutation({
    onSuccess: () => {
      toast.success("Waiver claim cancelled");
      refetchClaims();
    },
    onError: (error) => toast.error(error.message),
  });

  const processWaivers = trpc.waiver.processWaivers.useMutation({
    onSuccess: (result) => {
      toast.success("Waivers processed", {
        description: `${result.log.length} claims reviewed.`,
      });
      refetchClaims();
      refetchLog();
    },
    onError: (error) => toast.error(error.message),
  });

  if (!league || !myTeam) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const isCommissioner = league.commissionerUserId === user?.id;
  const lastProcessedAt = transactionLog?.[0]?.processedAt;

  return (
    <div className="min-h-screen bg-background">
      <LeagueNav
        leagueId={leagueId}
        leagueName={league.name}
        teamCount={league.teams?.length || 0}
        maxTeams={league.maxTeams}
        leagueType={league.leagueType}
        isCommissioner={isCommissioner}
        hasTeam={true}
        currentPage="waivers"
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Waiver Wire</h2>
              <p className="text-muted-foreground">
                Submit bids, track results, and review history.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Card className="w-full md:w-auto">
                <CardContent className="p-4 flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your FAAB</p>
                    <p className="text-2xl font-bold">{formatCurrency(myTeam.faabBudget)}</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Waiver Priority</p>
                    <p className="text-2xl font-bold">#{myTeam.waiverPriority}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {isCommissioner && (
            <Alert>
              <Gavel className="h-4 w-4" />
              <AlertTitle>Commissioner Tools</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 mt-2 md:flex-row md:items-center md:justify-between">
                <span>
                  {lastProcessedAt
                    ? `Last processed ${formatTimestamp(lastProcessedAt)}`
                    : "Waivers have not been processed yet."}
                </span>
                <Button
                  size="sm"
                  onClick={() => processWaivers.mutate({ leagueId })}
                  disabled={processWaivers.isPending}
                >
                  {processWaivers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Process Waivers Now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="claims" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="claims">My Claims</TabsTrigger>
              <TabsTrigger value="log">Transaction Log</TabsTrigger>
            </TabsList>

            <TabsContent value="claims" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Claims</CardTitle>
                  <CardDescription>
                    Active bids awaiting the next processing window.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {claimsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : claims.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player to Add</TableHead>
                          <TableHead>Player to Drop</TableHead>
                          <TableHead>Bid</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {claims.map((claim: any) => (
                          <TableRow key={claim.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{claim.addAssetName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {claim.addAssetLabel}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {claim.dropAssetName ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">{claim.dropAssetName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {claim.dropAssetLabel}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(claim.bidAmount)}</TableCell>
                            <TableCell>{formatTimestamp(claim.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelClaim.mutate({ claimId: claim.id })}
                                disabled={cancelClaim.isPending}
                              >
                                Cancel
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      You have no pending waiver claims.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="log" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Log</CardTitle>
                  <CardDescription>
                    Recent waiver outcomes for everyone in the league.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {logLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : transactionLog.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Processed</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead>Dropped</TableHead>
                          <TableHead>Bid</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionLog.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell>{formatTimestamp(entry.processedAt)}</TableCell>
                            <TableCell>{entry.teamName}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{entry.addAssetName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {entry.addAssetLabel}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {entry.dropAssetName ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">{entry.dropAssetName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {entry.dropAssetLabel}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(entry.bidAmount)}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariants[entry.status] || "secondary"}>
                                {entry.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No waiver activity has been processed yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

