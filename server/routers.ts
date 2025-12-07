import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { leagueRouter } from "./leagueRouter";
import { draftRouter } from "./draftRouter";
import { lineupRouter } from "./lineupRouter";
import { rosterRouter } from "./rosterRouter";
import { scoringRouter } from "./scoringRouter";
import { statsRouter } from "./statsRouter";
import { dataSyncRouter } from "./dataSyncRouter";
import { matchupRouter } from "./matchupRouter";
import { standingsRouter } from "./standingsRouter";
import { playoffRouter } from "./playoffRouter";
import { invitationRouter } from "./invitationRouter";
import { adminRouter } from "./routes/adminRouter";
import { predictionRouter } from "./predictionRouter";
import { profileRouter } from "./profileRouter";
import { debugRouter } from "./debugRouter";
import { leaderboardRouter } from "./leaderboardRouter";
import { waiverRouter } from "./waiverRouter";
import { tradeRouter } from "./tradeRouter";
import { recapRouter } from "./recapRouter";
import { achievementRouter } from "./achievementRouter";
import { chatRouter } from "./chatRouter";
import { favoriteRouter } from "./favoriteRouter";
import { dailySummaryRouter } from "./dailySummaryRouter";
import { publicModeRouter } from "./publicModeRouter";
import { stockMarketRouter } from "./routes/stockMarketRouter";
import { portfolioDuelsRouter } from "./portfolioDuelsRouter";
import { tycoonRouter } from "./routers/tycoonRouter";


export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  league: leagueRouter,
  draft: draftRouter,
  lineup: lineupRouter,
  roster: rosterRouter,
  scoring: scoringRouter,
  stats: statsRouter,
  dataSync: dataSyncRouter,
  matchup: matchupRouter,
  standings: standingsRouter,
  playoff: playoffRouter,
  invitation: invitationRouter,
  admin: adminRouter,
  prediction: predictionRouter,
  profile: profileRouter,
  debug: debugRouter,
  leaderboard: leaderboardRouter,
  waiver: waiverRouter,
  trade: tradeRouter,
  recap: recapRouter,
  achievement: achievementRouter,

  chat: chatRouter,
  favorite: favoriteRouter,
  dailySummary: dailySummaryRouter,
  publicMode: publicModeRouter,
  stockMarket: stockMarketRouter,
  duels: portfolioDuelsRouter,

  // Dispensary Tycoon Game
  tycoon: tycoonRouter,
});

export type AppRouter = typeof appRouter;
