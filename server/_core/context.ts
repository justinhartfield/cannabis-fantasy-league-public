import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { verifyToken } from "@clerk/backend";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Sync Clerk user to database
 * Creates or updates user in database based on Clerk user data
 * Note: Clerk JWT may not include username - client will sync full profile later
 */
async function syncClerkUser(clerkUserId: string, email: string | undefined, name: string | undefined): Promise<User | null> {
  try {
    // Check if user already exists (using openId field for Clerk ID)
    const existingUser = await getUserByOpenId(clerkUserId);

    if (existingUser) {
      console.log('[tRPC Context] ✅ Found existing user:', existingUser.id, existingUser.name);
      return existingUser;
    }

    // Create new user using upsertUser
    // Use the name from Clerk JWT if available, otherwise use a placeholder
    // The client-side will sync the full Clerk profile (including username) after login
    let username: string;
    if (name && !name.includes('@')) {
      // Use name from Clerk JWT if it looks like a real name
      username = name;
    } else if (email) {
      // Use email prefix as a placeholder (will be synced from client)
      username = email.split('@')[0];
    } else {
      // Last resort fallback - client will update this
      username = `user_${clerkUserId.slice(-8)}`;
    }
    
    // Don't pass lastSignedIn - let it default in upsertUser
    await upsertUser({
      openId: clerkUserId,
      email: email || null,
      name: username,
      loginMethod: 'clerk',
      role: 'user',
    });

    // Fetch the newly created user
    const newUser = await getUserByOpenId(clerkUserId);
    
    if (newUser) {
      console.log('[tRPC Context] ✅ Created new user from Clerk:', newUser.id, newUser.name, '(will sync full profile from client)');
      return newUser;
    }

    console.error('[tRPC Context] ❌ Failed to fetch newly created user');
    return null;
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
