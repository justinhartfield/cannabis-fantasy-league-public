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
import { Loader2, RefreshCw, ArrowRightLeft, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";

export default function Trades() {
  const { id } = useParams();
  const leagueId = parseInt(id!);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");
  
  // Fetch league details
  const { data: league } = trpc.league.getById.useQuery({ leagueId });
  
  // Fetch user's team
  const { data: myTeam } = trpc.league.getMyTeam.useQuery({ leagueId });
  
  // Placeholder for trades
  const trades: any[] = [];

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
        currentPage="trades"
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Trade Center</h2>
              <p className="text-muted-foreground">
                Propose and manage player trades
              </p>
            </div>
            <Button>
              <RefreshCw className="mr-2 h-4 w-4" />
              Propose Trade
            </Button>
          </div>

          <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active Trades</TabsTrigger>
              <TabsTrigger value="history">Trade History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Trades</CardTitle>
                  <CardDescription>
                    Trades waiting for response or processing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trades && trades.length > 0 ? (
                    <div className="space-y-4">
                      {/* Trade cards */}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No active trades.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trade History</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="text-center py-12 text-muted-foreground">
                    No trade history.
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

