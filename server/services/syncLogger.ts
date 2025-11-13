/**
 * Sync Logger Service
 * Handles logging for data sync operations
 */

import { db } from '../db';
import { syncJobs, syncLogs } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export class SyncLogger {
  private jobId: number;

  constructor(jobId: number) {
    this.jobId = jobId;
  }

  async info(message: string, metadata?: any) {
    await db.insert(syncLogs).values({
      jobId: this.jobId,
      level: 'info',
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    console.log(`[Job ${this.jobId}] INFO: ${message}`, metadata || '');
  }

  async warn(message: string, metadata?: any) {
    await db.insert(syncLogs).values({
      jobId: this.jobId,
      level: 'warn',
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    console.warn(`[Job ${this.jobId}] WARN: ${message}`, metadata || '');
  }

  async error(message: string, metadata?: any) {
    await db.insert(syncLogs).values({
      jobId: this.jobId,
      level: 'error',
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    console.error(`[Job ${this.jobId}] ERROR: ${message}`, metadata || '');
  }

  async updateJobStatus(status: string, details?: string, counts?: { processed?: number; total?: number }) {
    const updateData: any = { status };
    
    if (details) updateData.details = details;
    if (counts?.processed !== undefined) updateData.processedCount = counts.processed;
    if (counts?.total !== undefined) updateData.totalCount = counts.total;
    
    if (status === 'running' && !updateData.startedAt) {
      updateData.startedAt = new Date().toISOString();
    }
    
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date().toISOString();
    }

    await db.update(syncJobs)
      .set(updateData)
      .where(eq(syncJobs.id, this.jobId));
  }
}

/**
 * Create a new sync job and return a logger for it
 */
export async function createSyncJob(jobName: string): Promise<SyncLogger> {
  const [job] = await db.insert(syncJobs).values({
    jobName,
    status: 'pending',
  }).returning();

  return new SyncLogger(job.id);
}
