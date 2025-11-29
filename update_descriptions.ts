
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from './server/db';
import { strains } from './drizzle/schema';
import { eq } from 'drizzle-orm';

const updates = [
    {
        name: "Khiron 5/7 Karamel",
        description: `
            <p><strong>Khiron 5/7 Karamel</strong> is a balanced hybrid strain known for its mild potency and distinct flavor profile.</p>
            <p>With a THC content of approximately 5% and CBD around 7%, it offers a gentle therapeutic effect suitable for patients seeking relief without intense psychoactivity. The "Karamel" name hints at its sweet, caramel-like aroma that makes consumption a pleasant experience.</p>
            <p>This strain is often prescribed for anxiety, mild pain, and stress relief, providing a calming effect that allows for daily functionality.</p>
        `
    },
    {
        name: "Khiron 19/1 Gelato",
        description: `
            <p><strong>Khiron 19/1 Gelato</strong> brings the famous Gelato genetics to the medical market with a potent 19% THC profile.</p>
            <p>This hybrid strain is celebrated for its dessert-like aroma, featuring notes of berry and citrus with a creamy finish. It delivers a strong, euphoric effect that can help alleviate chronic pain, depression, and insomnia.</p>
            <p>Patients appreciate Gelato for its ability to provide physical relaxation while maintaining mental clarity, making it a versatile option for various conditions.</p>
        `
    },
    {
        name: "Aurora Typ 1",
        description: `
            <p><strong>Aurora Typ 1</strong> is a high-quality medical cannabis flower produced by Aurora, a global leader in the industry.</p>
            <p>Characterized by its consistent quality and reliable potency, this strain is cultivated under strict GMP standards. It typically features a high THC content, making it effective for treating severe pain and spasticity.</p>
            <p>The terpene profile offers a classic cannabis aroma, and its effects are known to be long-lasting, providing sustained relief for patients with chronic conditions.</p>
        `
    },
    {
        name: "Weeco 25/1",
        description: `
            <p><strong>Weeco 25/1</strong> is a potent strain with a high THC concentration of approximately 25%.</p>
            <p>Sourced by Weeco, this product is designed for experienced patients who require higher doses for effective symptom management. It is particularly effective for severe pain, appetite stimulation, and sleep disorders.</p>
            <p>The flowers are dense and resinous, indicating a high quality of cultivation and curing. Its strong effects are best suited for evening use.</p>
        `
    },
    {
        name: "Tilray THC25 Indica No.2",
        description: `
            <p><strong>Tilray THC25 Indica No.2</strong> is a robust indica-dominant strain offering powerful sedative effects.</p>
            <p>With 25% THC, it is one of the stronger options available from Tilray. It is ideal for patients suffering from severe insomnia, chronic pain, or muscle spasms.</p>
            <p>The strain features a rich, earthy aroma with hints of pine. Its relaxing properties help induce deep sleep and physical comfort, making it a staple for nighttime relief.</p>
        `
    }
];

async function updateDescriptions() {
    const db = await getDb();
    if (!db) {
        console.error('Failed to connect to DB');
        process.exit(1);
    }

    for (const update of updates) {
        await db.update(strains)
            .set({ description: update.description })
            .where(eq(strains.name, update.name));
        console.log(`Updated ${update.name}`);
    }

    process.exit(0);
}

updateDescriptions().catch(console.error);
