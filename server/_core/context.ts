import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

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
    const cookieHeader = opts.req.headers.cookie;
    const parsedCookies = (opts.req as any).cookies;
    console.log('[tRPC Context] Headers.cookie:', cookieHeader ? 'present' : 'missing');
    console.log('[tRPC Context] req.cookies:', parsedCookies ? JSON.stringify(Object.keys(parsedCookies)) : 'undefined');
    console.log('[tRPC Context] app_session_id:', parsedCookies?.app_session_id ? 'present' : 'missing');
    
    user = await sdk.authenticateRequest(opts.req);
    console.log('[tRPC Context] ✅ Authenticated user:', user?.openId);
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
