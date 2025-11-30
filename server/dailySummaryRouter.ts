import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDailySummaryService } from './services/dailySummaryService';

export const dailySummaryRouter = router({
    getLatest: publicProcedure.query(async () => {
        const service = getDailySummaryService();
        return await service.getLatestSummary();
    }),

    getByDate: publicProcedure
        .input(z.object({ date: z.string() }))
        .query(async ({ input }) => {
            const service = getDailySummaryService();
            return await service.getSummaryByDate(input.date);
        }),
});
