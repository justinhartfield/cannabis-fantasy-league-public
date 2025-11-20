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
import AcceptInvitation from "./pages/AcceptInvitation";
import Login from "./pages/Login";
import SignUpPage from "./pages/SignUp";
import Admin from "./pages/Admin";
import PredictionStreak from "./pages/PredictionStreak";
import PredictionLeaderboard from "./pages/PredictionLeaderboard";
import Profile from "./pages/Profile";
import { useEffect } from "react";
import { Navigation } from "./components/Navigation";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/login"} component={Login} />
      <Route path={"/sign-up"} component={SignUpPage} />
      {/* Clerk SSO callback routes - these are handled by Clerk automatically */}
      <Route path={"/login/sso-callback"} component={Login} />
      <Route path={"/sign-up/sso-callback"} component={SignUpPage} />
      <Route path={"/leagues"} component={LeagueList} />
      <Route path={"/league/create"} component={CreateLeague} />
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
      <Route path={"/profile"} component={Profile} />
      <Route path={"/invitations/:token"} component={AcceptInvitation} />
      <Route path={"/admin"} component={Admin} />

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
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
        <Navigation />
        <Router />
        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
