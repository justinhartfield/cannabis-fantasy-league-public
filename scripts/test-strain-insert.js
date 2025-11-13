import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cannabisStrains } from '../drizzle/schema.js';

const client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const db = drizzle(client);

async function testInsert() {
  try {
    console.log('Testing simple strain insert...');
    
    const testStrain = {
      metabaseId: 'test-123',
      name: 'Test Strain',
      slug: 'test-strain',
      type: 'hybrid',
      description: 'Test description',
      effects: JSON.stringify(['Happy', 'Relaxed']),
      flavors: JSON.stringify(['Sweet', 'Earthy']),
      terpenes: JSON.stringify(['Myrcene', 'Limonene']),
      thcMin: 10,
      thcMax: 20,
      cbdMin: 0,
      cbdMax: 1,
      pharmaceuticalProductCount: 0,
    };
    
    console.log('Inserting:', testStrain);
    
    const result = await db.insert(cannabisStrains).values(testStrain).returning();
    
    console.log('Success! Inserted:', result);
    
    // Clean up
    await db.delete(cannabisStrains).where({ metabaseId: 'test-123' });
    console.log('Test strain deleted');
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

testInsert();
