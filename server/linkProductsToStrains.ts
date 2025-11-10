/**
 * Link Products to Cannabis Strains
 * 
 * This script matches products to cannabis strains based on name similarity.
 * It updates the strainId field in the products (strains) table.
 */

import { getDb } from './db';
import { strains as products, cannabisStrains } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function linkProductsToStrains() {
  console.log('='.repeat(60));
  console.log('Linking Products to Cannabis Strains');
  console.log('='.repeat(60));
  console.log('');

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Get all cannabis strains
    const allStrains = await db.select().from(cannabisStrains);
    console.log(`Found ${allStrains.length} cannabis strains`);

    // Get all products
    const allProducts = await db.select().from(products);
    console.log(`Found ${allProducts.length} products`);
    console.log('');

    let linked = 0;
    let notLinked = 0;

    // Create a map of strain names (lowercase) to strain IDs
    const strainMap = new Map<string, number>();
    for (const strain of allStrains) {
      const nameLower = strain.name.toLowerCase();
      strainMap.set(nameLower, strain.id);
      
      // Also add slug variations
      strainMap.set(strain.slug.toLowerCase(), strain.id);
    }

    console.log('Matching products to strains...');
    
    for (const product of allProducts) {
      try {
        const productNameLower = product.name.toLowerCase();
        
        // Try exact match first
        let matchedStrainId: number | null = null;
        
        // Check if product name contains any strain name
        for (const [strainName, strainId] of strainMap.entries()) {
          if (productNameLower.includes(strainName)) {
            matchedStrainId = strainId;
            break;
          }
        }

        if (matchedStrainId) {
          // Update product with matched strain ID
          await db
            .update(products)
            .set({ strainId: matchedStrainId })
            .where(eq(products.id, product.id));
          
          linked++;
          
          if (linked % 100 === 0) {
            console.log(`  Linked ${linked} products...`);
          }
        } else {
          notLinked++;
        }
      } catch (error) {
        console.error(`Error linking product ${product.name}:`, error);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Product-Strain Linking Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Linked: ${linked} products`);
    console.log(`Not linked: ${notLinked} products`);
    console.log(`Success rate: ${((linked / allProducts.length) * 100).toFixed(1)}%`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Product-Strain Linking Failed!');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the linking
linkProductsToStrains()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
