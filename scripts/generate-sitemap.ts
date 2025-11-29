import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env
import fs from 'fs';
import path from 'path';
import { getDb } from '../server/db';
import { manufacturers, pharmacies, brands, strains, products } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

const BASE_URL = 'https://cannabisfantasyleague.com'; // Replace with actual domain

async function generateSitemap() {
    console.log('Generating sitemap...');

    const db = await getDb();
    if (!db) {
        console.error('❌ Failed to connect to database');
        process.exit(1);
    }

    const staticRoutes = [
        '/',
        '/leaderboard',
        '/rules',
        '/privacy',
        '/contact',
        '/rankings',
        '/rankings/manufacturer',
        '/rankings/pharmacy',
        '/rankings/brand',
        '/rankings/product',
        '/rankings/strain',
        '/login',
        '/sign-up',
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static routes
    staticRoutes.forEach(route => {
        sitemap += `  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>
`;
    });

    // Fetch top entities for dynamic routes
    // Limit to top 100 of each to avoid huge sitemap for now

    console.log('Fetching top manufacturers...');
    const topManufacturers = await db.select({ id: manufacturers.id }).from(manufacturers).limit(100);
    topManufacturers.forEach(m => {
        sitemap += `  <url>
    <loc>${BASE_URL}/entity/manufacturer/${m.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

    console.log('Fetching top pharmacies...');
    const topPharmacies = await db.select({ id: pharmacies.id }).from(pharmacies).limit(100);
    topPharmacies.forEach(p => {
        sitemap += `  <url>
    <loc>${BASE_URL}/entity/pharmacy/${p.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

    console.log('Fetching top brands...');
    const topBrands = await db.select({ id: brands.id }).from(brands).limit(100);
    topBrands.forEach(b => {
        sitemap += `  <url>
    <loc>${BASE_URL}/entity/brand/${b.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

    console.log('Fetching top strains...');
    const topStrains = await db.select({ id: strains.id }).from(strains).limit(100);
    topStrains.forEach(s => {
        sitemap += `  <url>
    <loc>${BASE_URL}/entity/strain/${s.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

    sitemap += `</urlset>`;

    const publicDir = path.join(process.cwd(), 'client', 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log(`✅ Sitemap generated at ${path.join(publicDir, 'sitemap.xml')}`);
    process.exit(0);
}

generateSitemap().catch(err => {
    console.error('❌ Failed to generate sitemap:', err);
    process.exit(1);
});
