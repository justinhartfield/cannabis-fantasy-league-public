import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@clerk/backend";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Sync Clerk user to database
 * Creates or updates user in database based on Clerk user data
 */
async function syncClerkUser(clerkUserId: string, email: string | undefined, name: string | undefined): Promise<User | null> {
  const db = getDb();
  
  try {
    // Check if user already exists (using openId field for Clerk ID)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.openId, clerkUserId),
    });

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const username = name || email?.split('@')[0] || `user_${clerkUserId.slice(0, 8)}`;
    
    const [newUser] = await db
      .insert(users)
      .values({
        openId: clerkUserId,
        email: email || null,
        name: name || username,
        loginMethod: 'clerk',
        role: 'user',
      })
      .returning();

    console.log('[tRPC Context] ✅ Created new user from Clerk:', newUser.id, newUser.name);
    return newUser;
  } catch (error) {
    console.error('[tRPC Context] ❌ Failed to sync Clerk user:', error);
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get Clerk session token from header
    const authHeader = opts.req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify Clerk JWT token
      const secretKey = process.env.CLERK_SECRET_KEY;
      
      if (!secretKey) {
        console.error('[tRPC Context] ❌ CLERK_SECRET_KEY not configured');
        return {
          req: opts.req,
          res: opts.res,
          user: null,
        };
      }

      try {
        // Verify the token with Clerk
        const payload = await verifyToken(token, {
          secretKey,
        });

        console.log('[tRPC Context] ✅ Clerk token verified, user ID:', payload.sub);

        // Extract user info from Clerk payload
        const email = (payload as any).email;
        const name = (payload as any).name || (payload as any).first_name;

        // Sync user to database
        user = await syncClerkUser(payload.sub, email, name);

        if (!user) {
          console.error('[tRPC Context] ❌ Failed to sync user to database');
        }
      } catch (verifyError) {
        console.error('[tRPC Context] ❌ Token verification failed:', verifyError instanceof Error ? verifyError.message : String(verifyError));
      }
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
