import { router, publicProcedure } from './_core/trpc';
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

    getAll: publicProcedure.query(async () => {
        return getDailySummaryService().getAllSummaries();
    }),

    getBySlug: publicProcedure
        .input(z.object({ date: z.string(), slug: z.string() }))
        .query(async ({ input }) => {
            // Slug is for SEO purposes, we look up by date
            return getDailySummaryService().getSummaryByDate(input.date);
        }),
});
