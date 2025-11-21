import { useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Gavel, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Waivers() {
  const { id } = useParams();
  const leagueId = parseInt(id!);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("available");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [dropAssetId, setDropAssetId] = useState<string>("none");
  
  // Fetch league details
  const { data: league } = trpc.league.getById.useQuery({ leagueId });
  
  // Fetch user's team
  const { data: myTeam } = trpc.league.getMyTeam.useQuery({ leagueId });
  
  // Fetch waiver claims
  // const { data: claims, refetch: refetchClaims } = trpc.waiver.getClaims.useQuery({ leagueId });
  
  // Placeholder for claims until router is implemented
  const claims: any[] = []; 
  
  const handlePlaceBid = () => {
    toast.info("Bid placed (simulation)");
    // Implement mutation call here
    setSelectedPlayer(null);
  };

  const handleProcessWaivers = () => {
    toast.info("Processing waivers (simulation)");
    // Implement mutation call here
  };

  if (!league || !myTeam) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  const isCommissioner = league.commissionerUserId === user?.id;

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
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Waiver Wire</h2>
              <p className="text-muted-foreground">
                Manage waiver claims and free agents
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Card className="w-full md:w-auto">
                <CardContent className="p-4 flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your FAAB</p>
                    <p className="text-2xl font-bold">${myTeam.faabBudget}</p>
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

          {/* Commissioner Tools */}
          {isCommissioner && (
            <Alert>
              <Gavel className="h-4 w-4" />
              <AlertTitle>Commissioner Tools</AlertTitle>
              <AlertDescription className="flex items-center justify-between mt-2">
                <span>Manually process waivers for the current period.</span>
                <Button size="sm" onClick={handleProcessWaivers}>Process Waivers Now</Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="available" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="available">Available Players</TabsTrigger>
              <TabsTrigger value="claims">My Claims</TabsTrigger>
              <TabsTrigger value="log">Transaction Log</TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Players</CardTitle>
                  <CardDescription>
                    Search and filter available players to add to your team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Player search component coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="claims" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Claims</CardTitle>
                  <CardDescription>
                    Your active waiver claims for the next processing period.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {claims && claims.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player to Add</TableHead>
                          <TableHead>Player to Drop</TableHead>
                          <TableHead>Bid Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Claims mapping */}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No pending claims.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="log" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Transaction history coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

