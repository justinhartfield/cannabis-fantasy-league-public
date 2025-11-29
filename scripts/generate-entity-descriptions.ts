import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

console.log('Loaded Env Keys:', Object.keys(process.env).filter(k => k.includes('API_KEY')));

import { getDb } from '../server/db';
import { manufacturers, pharmacies, brands, strains, products } from '../drizzle/schema';
import { desc, eq, isNull, sql } from 'drizzle-orm';


// Configuration
const BATCH_SIZE = 5; // Process 5 entities at a time
const LIMIT_PER_TYPE = 100; // Top 100 of each type

async function generateDescription(type: string, name: string, context: string): Promise<string | null> {
    console.log(`Generating description for ${type}: ${name}...`);

    // Dynamically import to ensure env vars are loaded
    const { invokeLLM } = await import('../server/_core/llm');

    const prompt = `
    Write a unique, engaging, and SEO-friendly description (approx. 300-500 words) for the cannabis ${type} named "${name}".
    
    Context: ${context}
    
    The description should be informative, professional, and highlight why this ${type} is significant in the market. 
    Do not use flowery or repetitive language. Focus on facts, market position, and consumer appeal.
    Structure the content with HTML tags (<h2>, <p>, <ul>, <li>) for readability.
    Do not include a main <h1> title. Start with an engaging introduction.
  `;

    try {
        const result = await invokeLLM({
            messages: [
                { role: 'system', content: 'You are an expert cannabis industry analyst and copywriter.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
        });

        const content = result.choices[0]?.message?.content;
        if (typeof content === 'string') {
            return content;
        }
        // Handle array content if necessary (though invokeLLM usually returns string for text)
        if (Array.isArray(content)) {
            return content.map(c => c.type === 'text' ? c.text : '').join('');
        }
        return null;
    } catch (error) {
        console.error(`Error generating description for ${name}:`, error);
        // Fallback to placeholder if LLM fails (e.g. missing API key)
        return `
            <p><strong>${name}</strong> is a prominent ${type} in the cannabis industry.</p>
            <p>Known for their commitment to quality and innovation, they have established a strong presence in the market. Their products are widely recognized for their consistency and effectiveness.</p>
            <p>As a key player in the sector, ${name} continues to set standards and drive the industry forward.</p>
        `;
    }
}

async function processEntities(db: any, table: any, type: string, nameField: string = 'name') {
    console.log(`Processing ${type}...`);

    // Fetch top entities without description
    // We order by id descending as a proxy for "recent" or just to have a deterministic order
    // Ideally we would order by rank/score if available, but let's just grab them.
    // Actually, for SEO we want the most popular ones.
    // Manufacturers has `currentRank`.
    // Pharmacies has `weeklyRevenueCents` or `productCount`.
    // Brands has `totalFavorites`.
    // Strains has `favoriteCount`.

    let query = db.select().from(table).where(isNull(table.description));

    if (type === 'manufacturer') {
        query = query.orderBy(table.currentRank);
    } else if (type === 'pharmacy') {
        query = query.orderBy(desc(table.productCount));
    } else if (type === 'brand') {
        query = query.orderBy(desc(table.totalFavorites));
    } else if (type === 'strain') {
        query = query.orderBy(desc(table.favoriteCount));
    } else if (type === 'product') {
        // Products might be too many, let's skip or limit strictly
        // Product table has no easy rank, maybe just limit
        query = query.limit(LIMIT_PER_TYPE);
    }

    const entities = await query.limit(LIMIT_PER_TYPE);
    console.log(`Found ${entities.length} ${type}s to update.`);

    for (let i = 0; i < entities.length; i += BATCH_SIZE) {
        const batch = entities.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (entity: any) => {
            const name = entity[nameField];
            let context = `${type} in the German medical cannabis market.`;

            if (type === 'manufacturer') {
                context += ` Rank: ${entity.currentRank || 'N/A'}. Products: ${entity.productCount}.`;
            } else if (type === 'pharmacy') {
                context += ` Location: ${entity.city}, ${entity.state}. Products: ${entity.productCount}.`;
            } else if (type === 'brand') {
                context += ` Favorites: ${entity.totalFavorites}.`;
            } else if (type === 'strain') {
                context += ` Genetics: ${entity.genetics || 'Unknown'}. THC: ${entity.thcContent || 'N/A'}. CBD: ${entity.cbdContent || 'N/A'}.`;
            }

            const description = await generateDescription(type, name, context);

            if (description) {
                await db.update(table)
                    .set({ description })
                    .where(eq(table.id, entity.id));
                console.log(`✅ Updated ${name}`);
            }
        }));
    }
}

async function main() {
    const db = await getDb();
    if (!db) {
        console.error('Failed to connect to DB');
        process.exit(1);
    }

    await processEntities(db, manufacturers, 'manufacturer');
    await processEntities(db, pharmacies, 'pharmacy');
    await processEntities(db, brands, 'brand');
    await processEntities(db, strains, 'strain');
    // await processEntities(db, products, 'product'); // Optional, maybe too many

    console.log('Done!');
    process.exit(0);
}

main().catch(console.error);
