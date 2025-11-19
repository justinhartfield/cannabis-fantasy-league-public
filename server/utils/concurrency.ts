
/**
 * Run tasks with limited concurrency
 */
export async function pLimit<T>(
  items: T[], 
  limit: number, 
  task: (item: T, index: number) => Promise<void>
): Promise<void> {
  const queue = [...items];
  let index = 0;
  
  const workers = Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      const currentIndex = index++;
      try {
        await task(item, currentIndex);
      } catch (error) {
        console.error(`Error processing item at index ${currentIndex}:`, error);
        // Continue with next item
      }
    }
  });

  await Promise.all(workers);
}

