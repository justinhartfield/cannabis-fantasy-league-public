import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import Admin from "./pages/Admin";
import ChallengeList from "./pages/ChallengeList";
import ChallengeDetail from "./pages/ChallengeDetail";
import ChallengeDraft from "./pages/ChallengeDraft";
import ChallengeResults from "./pages/ChallengeResults";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/login"} component={Login} />
      <Route path={"/leagues"} component={LeagueList} />
      <Route path={"/league/create"} component={CreateLeague} />
      <Route path={"/league/:id"} component={LeagueDetail} />
      <Route path={"/league/:id/draft"} component={Draft} />
      <Route path={"/league/:id/pre-draft"} component={PreDraft} />
      <Route path={"/league/:id/matchups"} component={Matchups} />
      <Route path={"/league/:id/standings"} component={Standings} />
      <Route path={"/league/:id/playoffs"} component={Playoffs} />
      <Route path={"/league/:id/lineup"} component={Lineup} />
      <Route path={"/league/:id/scoring"} component={Scoring} />
      <Route path={"/invitations/:token"} component={AcceptInvitation} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/challenges"} component={ChallengeList} />
      <Route path={"/challenge/:id"} component={ChallengeDetail} />
      <Route path={"/challenge/:id/draft"} component={ChallengeDraft} />
      <Route path={"/challenge/:id/results"} component={ChallengeResults} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
