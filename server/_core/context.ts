import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get Clerk session token from header
    const authHeader = opts.req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // In a real implementation, you would verify the Clerk JWT token here
      // For now, we'll extract the user ID from the token payload
      // You should use @clerk/backend to properly verify the token
      
      console.log('[tRPC Context] Clerk token present');
      
      // TODO: Implement proper Clerk JWT verification
      // For now, we'll just check if the token exists
      // In production, use: const { userId } = await verifyToken(token);
      
    } else {
      console.log('[tRPC Context] ⚠️  No Clerk token found');
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.log('[tRPC Context] ❌ Authentication failed:', error instanceof Error ? error.message : String(error));
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
