
import { dailyChallengeAggregatorV2 } from '../server/dailyChallengeAggregatorV2';

async function main() {
  const date = new Date().toISOString().split('T')[0];
  console.log(`Starting performance test for aggregation on ${date}...`);
  
  const startTime = Date.now();
  
  try {
    const summary = await dailyChallengeAggregatorV2.aggregateForDate(date, {
      useTrendScoring: true
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n✅ Aggregation complete in ${duration.toFixed(2)} seconds`);
    console.log('Summary:', JSON.stringify(summary, null, 2));
    
    if (duration > 15) {
        console.error('❌ Performance test failed: Aggregation took longer than 15 seconds');
        process.exit(1);
    } else {
        console.log('✅ Performance test passed!');
        process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Aggregation failed:', error);
    process.exit(1);
  }
}

main();

