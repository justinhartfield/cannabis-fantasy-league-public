import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import DraftBoard from "@/components/DraftBoard";
import LineupEditor from "@/components/LineupEditor";
import RosterDisplay from "@/components/RosterDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Loader2 } from "@/lib/icons";

/**
 * RosterTest Page
 * 
 * Test page to showcase the new 9-player roster UI components:
 * - DraftBoard
 * - LineupEditor
 * - RosterDisplay
 */
export default function RosterTest() {
  const { user, loading, isAuthenticated } = useAuth();

  // Mock data for testing
  const [mockLineup, setMockLineup] = useState([
    { position: "MFG1", assetType: "manufacturer" as const, assetId: 1, assetName: "Tilray", points: 45, locked: false },
    { position: "MFG2", assetType: "manufacturer" as const, assetId: 2, assetName: "Aurora", points: 38, locked: false },
    { position: "CSTR1", assetType: "cannabis_strain" as const, assetId: 101, assetName: "Gelato", points: 52, locked: false },
    { position: "CSTR2", assetType: "cannabis_strain" as const, assetId: 102, assetName: "OG Kush", points: 48, locked: false },
    { position: "PRD1", assetType: "product" as const, assetId: 201, assetName: "Pedanios 22/1", points: 41, locked: false },
    { position: "PRD2", assetType: "product" as const, assetId: null, assetName: null, points: 0, locked: false },
    { position: "PHM1", assetType: "pharmacy" as const, assetId: 301, assetName: "Apotheke am Markt", points: 35, locked: false },
    { position: "PHM2", assetType: "pharmacy" as const, assetId: 302, assetName: "Stadt Apotheke", points: 32, locked: false },
    { position: "FLEX", assetType: "cannabis_strain" as const, assetId: 103, assetName: "Wedding Cake", points: 55, locked: false },
  ]);

  const [mockRoster] = useState([
    {
      id: 1,
      assetType: "manufacturer" as const,
      assetId: 1,
      assetName: "Tilray",
      acquiredWeek: 1,
      acquiredVia: "draft" as const,
      weeklyPoints: 45,
      seasonPoints: 180,
      trend: "up" as const,
    },
    {
      id: 2,
      assetType: "manufacturer" as const,
      assetId: 2,
      assetName: "Aurora",
      acquiredWeek: 1,
      acquiredVia: "draft" as const,
      weeklyPoints: 38,
      seasonPoints: 152,
      trend: "stable" as const,
    },
    {
      id: 3,
      assetType: "cannabis_strain" as const,
      assetId: 101,
      assetName: "Gelato",
      acquiredWeek: 2,
      acquiredVia: "draft" as const,
      weeklyPoints: 52,
      seasonPoints: 156,
      trend: "up" as const,
    },
    {
      id: 4,
      assetType: "cannabis_strain" as const,
      assetId: 102,
      assetName: "OG Kush",
      acquiredWeek: 2,
      acquiredVia: "draft" as const,
      weeklyPoints: 48,
      seasonPoints: 144,
      trend: "down" as const,
    },
    {
      id: 5,
      assetType: "product" as const,
      assetId: 201,
      assetName: "Pedanios 22/1",
      acquiredWeek: 3,
      acquiredVia: "waiver" as const,
      weeklyPoints: 41,
      seasonPoints: 82,
      trend: "up" as const,
    },
    {
      id: 6,
      assetType: "pharmacy" as const,
      assetId: 301,
      assetName: "Apotheke am Markt",
      acquiredWeek: 1,
      acquiredVia: "draft" as const,
      weeklyPoints: 35,
      seasonPoints: 140,
      trend: "stable" as const,
    },
    {
      id: 7,
      assetType: "pharmacy" as const,
      assetId: 302,
      assetName: "Stadt Apotheke",
      acquiredWeek: 1,
      acquiredVia: "draft" as const,
      weeklyPoints: 32,
      seasonPoints: 128,
      trend: "down" as const,
    },
    {
      id: 8,
      assetType: "cannabis_strain" as const,
      assetId: 103,
      assetName: "Wedding Cake",
      acquiredWeek: 4,
      acquiredVia: "free_agent" as const,
      weeklyPoints: 55,
      seasonPoints: 55,
      trend: "up" as const,
    },
  ]);

  const [isLineupLocked, setIsLineupLocked] = useState(false);

  // Redirect to login if not authenticated
  if (!loading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleDraftPick = (assetType: any, assetId: number) => {
    console.log("Draft pick:", assetType, assetId);
  };

  const handleUpdateLineup = (lineup: any) => {
    setMockLineup(lineup);
  };

  const handleLockLineup = () => {
    setIsLineupLocked(!isLineupLocked);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Roster System Test - 9-Spieler Struktur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Testseite für die neuen UI-Komponenten mit Cannabis Strains Support:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
              <li>2 Hersteller (Manufacturers)</li>
              <li>2 Cannabis Strains (Genetik/Sorten)</li>
              <li>2 Produkte (Pharmazeutische Produkte)</li>
              <li>2 Apotheken (Pharmacies)</li>
              <li>1 Flex (Beliebige Kategorie)</li>
            </ul>
          </CardContent>
        </Card>

        <Tabs defaultValue="lineup" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="lineup">Lineup Editor</TabsTrigger>
            <TabsTrigger value="roster">Roster Display</TabsTrigger>
            <TabsTrigger value="draft">Draft Board</TabsTrigger>
          </TabsList>

          <TabsContent value="lineup" className="mt-6">
            <LineupEditor
              teamId={30003}
              year={2025}
              week={1}
              lineup={mockLineup}
              isLocked={isLineupLocked}
              onUpdateLineup={handleUpdateLineup}
              onLockLineup={handleLockLineup}
            />
          </TabsContent>

          <TabsContent value="roster" className="mt-6">
            <RosterDisplay
              teamId={30003}
              roster={mockRoster}
              onManageRoster={() => console.log("Manage roster clicked")}
            />
          </TabsContent>

          <TabsContent value="draft" className="mt-6">
            <DraftBoard
              leagueId={30003}
              currentPick={15}
              isMyTurn={true}
              myRoster={[
                { assetType: "manufacturer", assetId: 1, name: "Remexian Pharma" },
                { assetType: "cannabis_strain", assetId: 1, name: "bucket_list" },
              ]}
              onDraftPick={handleDraftPick}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
