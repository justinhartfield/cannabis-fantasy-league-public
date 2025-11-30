import { getDb } from '../db';
import { dailySummaries, manufacturerDailyStats, strainDailyStats, pharmacyDailyStats, brandDailyStats, manufacturers, cannabisStrains, pharmacies, brands } from '../../drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Types for entity data
type EntityWithId = { id: number; name: string };
type StatsSnapshot = {
    topManufacturers: EntityWithId[];
    topStrains: EntityWithId[];
    topPharmacies: EntityWithId[];
    topBrands: EntityWithId[];
};

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Post-process AI content to ensure all entity mentions are properly linked.
 * This catches cases where the AI might have mentioned an entity without 
 * using the markdown link format.
 */
function ensureEntityLinks(content: string, stats: StatsSnapshot): string {
    let processed = content;

    // Build entity lookup with type info
    const entities: Array<{ name: string; id: number; type: string; path: string }> = [
        ...stats.topManufacturers.map(e => ({ ...e, type: 'manufacturer', path: `/entity/manufacturer/${e.id}` })),
        ...stats.topStrains.map(e => ({ ...e, type: 'strain', path: `/entity/strain/${e.id}` })),
        ...stats.topPharmacies.map(e => ({ ...e, type: 'pharmacy', path: `/entity/pharmacy/${e.id}` })),
        ...stats.topBrands.map(e => ({ ...e, type: 'brand', path: `/entity/brand/${e.id}` })),
    ];

    // Sort by name length descending to handle longer names first
    // (prevents partial matches like "Green" matching before "Green House Seeds")
    entities.sort((a, b) => b.name.length - a.name.length);

    for (const entity of entities) {
        // Skip empty names
        if (!entity.name || entity.name.trim() === '') continue;

        // Pattern to match entity name that is NOT already inside a markdown link
        // Uses negative lookbehind for [ and negative lookahead for ]( or ](/
        // This regex matches the entity name only if it's not part of [Name](url) format
        const escapedName = escapeRegex(entity.name);
        
        // Match entity name that:
        // - Is not preceded by [ (would be link text start)
        // - Is not followed by ]( (would be inside link)
        // - Has word boundaries
        const pattern = new RegExp(
            `(?<!\\[)\\b(${escapedName})\\b(?!\\]\\()`,
            'gi'
        );

        processed = processed.replace(pattern, `[$1](${entity.path})`);
    }

    return processed;
}

export const getDailySummaryService = () => {
    return {
        async generateDailySummary(date: string) {
            const db = await getDb();
            if (!db) throw new Error('Database not available');

            console.log(`Generating daily summary for ${date}...`);

            // 1. Fetch Stats
            const topManufacturers = await db
                .select({
                    id: manufacturers.id,
                    name: manufacturers.name,
                    points: manufacturerDailyStats.totalPoints,
                    sales: manufacturerDailyStats.totalSalesVolume,
                })
                .from(manufacturerDailyStats)
                .innerJoin(manufacturers, eq(manufacturerDailyStats.manufacturerId, manufacturers.id))
                .where(eq(manufacturerDailyStats.date, date))
                .orderBy(desc(manufacturerDailyStats.totalPoints))
                .limit(5);

            const topStrains = await db
                .select({
                    id: cannabisStrains.id,
                    name: cannabisStrains.name,
                    points: strainDailyStats.totalPoints,
                    orders: strainDailyStats.totalOrderVolume,
                })
                .from(strainDailyStats)
                .innerJoin(cannabisStrains, eq(strainDailyStats.strainId, cannabisStrains.id))
                .where(eq(strainDailyStats.date, date))
                .orderBy(desc(strainDailyStats.totalPoints))
                .limit(5);

            const topPharmacies = await db
                .select({
                    id: pharmacies.id,
                    name: pharmacies.name,
                    points: pharmacyDailyStats.totalPoints,
                    revenue: pharmacyDailyStats.totalRevenue,
                })
                .from(pharmacyDailyStats)
                .innerJoin(pharmacies, eq(pharmacyDailyStats.pharmacyId, pharmacies.id))
                .where(eq(pharmacyDailyStats.date, date))
                .orderBy(desc(pharmacyDailyStats.totalPoints))
                .limit(5);

            const topBrands = await db
                .select({
                    id: brands.id,
                    name: brands.name,
                    points: brandDailyStats.totalPoints,
                    sales: brandDailyStats.totalSalesVolume,
                })
                .from(brandDailyStats)
                .innerJoin(brands, eq(brandDailyStats.brandId, brands.id))
                .where(eq(brandDailyStats.date, date))
                .orderBy(desc(brandDailyStats.totalPoints))
                .limit(5);

            const statsSnapshot = {
                topManufacturers,
                topStrains,
                topPharmacies,
                topBrands,
            };

            console.log('Stats snapshot:', JSON.stringify(statsSnapshot, null, 2));

            // 2. Generate Content with OpenAI
            const prompt = `
        You are a sports journalist covering the Cannabis Fantasy League.
        Write a daily wrap-up article for ${date}.
        
        Here are the stats:
        Top Manufacturers: ${topManufacturers.map(m => `${m.name} (ID: ${m.id}, ${m.points} pts)`).join(', ')}
        Top Strains: ${topStrains.map(s => `${s.name} (ID: ${s.id}, ${s.points} pts)`).join(', ')}
        Top Pharmacies: ${topPharmacies.map(p => `${p.name} (ID: ${p.id}, ${p.points} pts)`).join(', ')}
        Top Brands: ${topBrands.map(b => `${b.name} (ID: ${b.id}, ${b.points} pts)`).join(', ')}

        Requirements:
        - Catchy Headline (max 10 words)
        - 2-3 paragraphs of exciting commentary.
        - Highlight the winners and any interesting trends.
        - Tone: Professional sports journalism (like ESPN/The Athletic).
        - **CRITICAL**: When mentioning an entity, you MUST use a Markdown link with the format:
          - Manufacturer: [Name](/entity/manufacturer/ID)
          - Strain: [Name](/entity/strain/ID)
          - Pharmacy: [Name](/entity/pharmacy/ID)
          - Brand: [Name](/entity/brand/ID)
          Example: "The market was dominated by [Green House Seeds](/entity/manufacturer/123) today..."
        - Return JSON format: { "headline": "...", "content": "..." }
      `;

            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');

            // 3. Post-process content to ensure all entity mentions are linked
            const processedContent = ensureEntityLinks(
                result.content || 'No summary available.',
                statsSnapshot
            );

            console.log('[DailySummary] Post-processed content with entity links');

            // 4. Save to DB
            await db.insert(dailySummaries).values({
                date,
                headline: result.headline || `Daily Summary for ${date}`,
                content: processedContent,
                stats: statsSnapshot,
            }).onConflictDoUpdate({
                target: dailySummaries.date,
                set: {
                    headline: result.headline,
                    content: processedContent,
                    stats: statsSnapshot,
                    createdAt: new Date().toISOString(), // Update timestamp
                },
            });

            return { ...result, content: processedContent };
        },

        async getLatestSummary() {
            const db = await getDb();
            if (!db) return null;
            const result = await db.select().from(dailySummaries).orderBy(desc(dailySummaries.date)).limit(1);
            return result[0];
        },

        async getSummaryByDate(date: string) {
            const db = await getDb();
            if (!db) return null;
            const result = await db.select().from(dailySummaries).where(eq(dailySummaries.date, date));
            return result[0];
        }
    };
};
