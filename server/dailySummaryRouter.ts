import { router, publicProcedure } from './trpc';
import { z } from 'zod';
import { getDailySummaryService } from './services/dailySummaryService';

export const dailySummaryRouter = router({
    getLatest: publicProcedure.query(async () => {
        return getDailySummaryService().getLatestSummary();
    }),

    getByDate: publicProcedure
        .input(z.object({ date: z.string() }))
        .query(async ({ input }) => {
            return getDailySummaryService().getSummaryByDate(input.date);
        }),
});
