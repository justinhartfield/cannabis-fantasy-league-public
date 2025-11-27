import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import LeagueList from "./pages/LeagueList";
import LeagueDetail from "./pages/LeagueDetail";
import CreateLeague from "./pages/CreateLeague";
import Draft from "./pages/Draft";
import PreDraft from "./pages/PreDraft";
import Matchups from "./pages/Matchups";
import Standings from "./pages/Standings";
import Playoffs from "./pages/Playoffs";
import Lineup from "./pages/Lineup";
import Scoring from "./pages/Scoring";
import Waivers from "./pages/Waivers";
import Trades from "./pages/Trades";
import AcceptInvitation from "./pages/AcceptInvitation";
import Login from "./pages/Login";
import SignUpPage from "./pages/SignUp";
import Admin from "./pages/Admin";
import PredictionStreak from "./pages/PredictionStreak";
import PredictionLeaderboard from "./pages/PredictionLeaderboard";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import InviteFriends from "./pages/InviteFriends";
import Join from "./pages/Join";
import Players from "./pages/Players";
import { useEffect } from "react";
import { AppLayout } from "./components/AppLayout";
import DashboardLayout from "./components/DashboardLayout";


function AuthedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path={"/"} component={Dashboard} />
        <Route path={"/leagues"} component={LeagueList} />
        <Route path={"/league/create"} component={CreateLeague} />
        {/* League routes (season mode) */}
        <Route path={"/league/:id"} component={LeagueDetail} />
        <Route path={"/league/:id/draft"} component={Draft} />
        <Route path={"/league/:id/pre-draft"} component={PreDraft} />
        <Route path={"/league/:id/matchups"} component={Matchups} />
        <Route path={"/league/:id/standings"} component={Standings} />
        <Route path={"/league/:id/playoffs"} component={Playoffs} />
        <Route path={"/league/:id/lineup"} component={Lineup} />
        <Route path={"/league/:id/scoring"} component={Scoring} />
        <Route path={"/league/:id/waivers"} component={Waivers} />
        <Route path={"/league/:id/trades"} component={Trades} />
        <Route path={"/league/:id/players"} component={Players} />
        {/* Challenge routes (daily mode) */}
        <Route path={"/challenge/:id"} component={LeagueDetail} />
        <Route path={"/challenge/:id/draft"} component={Draft} />
        <Route path={"/challenge/:id/pre-draft"} component={PreDraft} />
        <Route path={"/challenge/:id/matchups"} component={Matchups} />
        <Route path={"/challenge/:id/standings"} component={Standings} />
        <Route path={"/challenge/:id/playoffs"} component={Playoffs} />
        <Route path={"/challenge/:id/lineup"} component={Lineup} />
        <Route path={"/challenge/:id/scoring"} component={Scoring} />
        <Route path={"/prediction-streak"} component={PredictionStreak} />
        <Route path={"/prediction-leaderboard"} component={PredictionLeaderboard} />
        <Route path={"/leaderboard"} component={Leaderboard} />
        <Route path={"/invite"} component={InviteFriends} />
        <Route path={"/profile"} component={Profile} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AdminRoute() {
  return (
    <DashboardLayout>
      <Admin />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/sign-up"} component={SignUpPage} />
      <Route path={"/join"} component={Join} />
      {/* Clerk SSO callback routes - these are handled by Clerk automatically */}
      <Route path={"/login/sso-callback"} component={Login} />
      <Route path={"/sign-up/sso-callback"} component={SignUpPage} />
      <Route path={"/invitations/:token"} component={AcceptInvitation} />
      <Route path={"/admin"} component={AdminRoute} />
      {/* League/Challenge creation must come before :id routes to avoid "create" being matched as an ID */}
      <Route path={"/league/create"} component={CreateLeague} />
      {/* Public challenge routes - these need to work without auth for landing page */}
      <Route path={"/league/:id"} component={LeagueDetail} />
      <Route path={"/challenge/:id"} component={LeagueDetail} />
      {/* Authenticated app shell */}
      <Route component={AuthedRoutes} />
    </Switch>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
