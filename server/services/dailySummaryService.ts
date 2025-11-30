import { getDb } from '../db';
import { dailySummaries, manufacturerDailyStats, strainDailyStats, pharmacyDailyStats, manufacturers, cannabisStrains, pharmacies } from '../../drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class DailySummaryService {
    async generateDailySummary(date: string): Promise<void> {
        console.log(`[DailySummary] Generating summary for ${date}...`);

        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        // 1. Fetch Top Performers
        const topManufacturers = await db
            .select({
                name: manufacturers.name,
                points: manufacturerDailyStats.totalPoints,
                sales: manufacturerDailyStats.salesVolumeGrams,
            })
            .from(manufacturerDailyStats)
            .innerJoin(manufacturers, eq(manufacturerDailyStats.manufacturerId, manufacturers.id))
            .where(eq(manufacturerDailyStats.statDate, date))
            .orderBy(desc(manufacturerDailyStats.totalPoints))
            .limit(5);

        const topStrains = await db
            .select({
                name: cannabisStrains.name,
                points: strainDailyStats.totalPoints,
                orders: strainDailyStats.orderVolumeGrams,
            })
            .from(strainDailyStats)
            .innerJoin(cannabisStrains, eq(strainDailyStats.strainId, cannabisStrains.id))
            .where(eq(strainDailyStats.statDate, date))
            .orderBy(desc(strainDailyStats.totalPoints))
            .limit(5);

        const topPharmacies = await db
            .select({
                name: pharmacies.name,
                points: pharmacyDailyStats.totalPoints,
                revenue: pharmacyDailyStats.revenueCents,
            })
            .from(pharmacyDailyStats)
            .innerJoin(pharmacies, eq(pharmacyDailyStats.pharmacyId, pharmacies.id))
            .where(eq(pharmacyDailyStats.statDate, date))
            .orderBy(desc(pharmacyDailyStats.totalPoints))
            .limit(5);

        // Prepare stats object for prompt and storage
        const stats = {
            date,
            topManufacturers,
            topStrains,
            topPharmacies,
        };

        // 2. Generate Summary with OpenAI
        const prompt = `
      You are a sports journalist covering the Cannabis Fantasy League.
      Write a daily wrap-up for ${date} based on the following stats:

      Top Manufacturers:
      ${topManufacturers.map((m, i) => `${i + 1}. ${m.name} (${m.points} pts, ${m.sales}g sales)`).join('\n')}

      Top Strains:
      ${topStrains.map((s, i) => `${i + 1}. ${s.name} (${s.points} pts, ${s.orders}g orders)`).join('\n')}

      Top Pharmacies:
      ${topPharmacies.map((p, i) => `${i + 1}. ${p.name} (${p.points} pts, $${(p.revenue / 100).toFixed(2)} revenue)`).join('\n')}

      Write a catchy headline and a 2-3 paragraph summary highlighting the winners, big gainers, and key action.
      Make it exciting, like an ESPN recap.
      Format the output as JSON with "headline" and "content" fields.
    `;

        try {
            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            const { headline, content } = result;

            if (!headline || !content) {
                throw new Error('Invalid response from OpenAI');
            }

            // 3. Save to Database
            await db
                .insert(dailySummaries)
                .values({
                    date,
                    headline,
                    content,
                    stats,
                })
                .onConflictDoUpdate({
                    target: dailySummaries.date,
                    set: {
                        headline,
                        content,
                        stats,
                        createdAt: new Date().toISOString(), // Update timestamp
                    },
                });

            console.log(`[DailySummary] Summary generated and saved for ${date}`);
        } catch (error) {
            console.error(`[DailySummary] Error generating summary:`, error);
            throw error;
        }
    }

    async getLatestSummary() {
        const db = await getDb();
        if (!db) return null;

        return db.query.dailySummaries.findFirst({
            orderBy: (dailySummaries, { desc }) => [desc(dailySummaries.date)],
        });
    }

    async getSummaryByDate(date: string) {
        const db = await getDb();
        if (!db) return null;

        return db.query.dailySummaries.findFirst({
            where: (dailySummaries, { eq }) => eq(dailySummaries.date, date),
        });
    }
}

// Singleton instance
let serviceInstance: DailySummaryService | null = null;

export function getDailySummaryService(): DailySummaryService {
    if (!serviceInstance) {
        serviceInstance = new DailySummaryService();
    }
    return serviceInstance;
}
