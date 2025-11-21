import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowLeft, BarChart3, ListOrdered, Swords, UserCircle, Timer, RefreshCw } from "lucide-react";
import { Link } from "wouter";

interface LeagueNavProps {
  leagueId: number;
  leagueName: string;
  teamCount: number;
  maxTeams: number;
  leagueType?: string;
  isCommissioner?: boolean;
  hasTeam?: boolean;
  currentPage?: "overview" | "scoring" | "standings" | "matchups" | "lineup" | "players" | "waivers" | "trades";
}

/**
 * LeagueNav Component
 * 
 * Reusable navigation header for all league pages
 * Updated: 2025-11-12
 */
export function LeagueNav({
  leagueId,
  leagueName,
  teamCount,
  maxTeams,
  leagueType = "season",
  isCommissioner = false,
  hasTeam = false,
  currentPage = "overview",
}: LeagueNavProps) {
  const basePath = leagueType === "challenge" ? `/challenge/${leagueId}` : `/league/${leagueId}`;

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{leagueName}</h1>
              <p className="text-sm text-muted-foreground">
                {teamCount} / {maxTeams} Teams
              </p>
            </div>
            {isCommissioner && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                Commissioner
              </Badge>
            )}
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          <Button 
            variant={currentPage === "overview" ? "default" : "ghost"} 
            size="sm" 
            asChild
          >
            <Link href={`${basePath}`}>
              <Trophy className="w-4 h-4 mr-2" />
              Übersicht
            </Link>
          </Button>
          <Button 
            variant={currentPage === "scoring" ? "default" : "ghost"} 
            size="sm" 
            asChild
          >
            <Link href={`${basePath}/scoring`}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Scoring
            </Link>
          </Button>
          <Button 
            variant={currentPage === "standings" ? "default" : "ghost"} 
            size="sm" 
            asChild
          >
            <Link href={`${basePath}/standings`}>
              <ListOrdered className="w-4 h-4 mr-2" />
              Tabelle
            </Link>
          </Button>
          <Button 
            variant={currentPage === "matchups" ? "default" : "ghost"} 
            size="sm" 
            asChild
          >
            <Link href={`${basePath}/matchups`}>
              <Swords className="w-4 h-4 mr-2" />
              Matchups
            </Link>
          </Button>
          {hasTeam && (
            <Button 
              variant={currentPage === "lineup" ? "default" : "ghost"} 
              size="sm" 
              asChild
            >
              <Link href={`${basePath}/lineup`}>
                <UserCircle className="w-4 h-4 mr-2" />
                Mein Lineup
              </Link>
            </Button>
          )}
          {hasTeam && leagueType !== "challenge" && (
            <>
              <Button 
                variant={currentPage === "waivers" ? "default" : "ghost"} 
                size="sm" 
                asChild
              >
                <Link href={`${basePath}/waivers`}>
                  <Timer className="w-4 h-4 mr-2" />
                  Waivers
                </Link>
              </Button>
              <Button 
                variant={currentPage === "trades" ? "default" : "ghost"} 
                size="sm" 
                asChild
              >
                <Link href={`${basePath}/trades`}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Trades
                </Link>
              </Button>
            </>
          )}
          {hasTeam && leagueType !== "challenge" && (
            <Button 
              variant={currentPage === "players" ? "default" : "ghost"} 
              size="sm" 
              asChild
            >
              <Link href={`${basePath}/players`}>
                <UserCircle className="w-4 h-4 mr-2" />
                Players
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
