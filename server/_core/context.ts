import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";

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
    // Try to get cookie from multiple sources
    const cookieHeader = opts.req.headers.cookie;
    const parsedCookies = (opts.req as any).cookies;
    const sessionCookie = parsedCookies?.[COOKIE_NAME] || 
                         (cookieHeader ? parseCookieHeader(cookieHeader)[COOKIE_NAME] : undefined);
    
    console.log('[tRPC Context] Cookie header:', cookieHeader ? 'present' : 'missing');
    console.log('[tRPC Context] Parsed cookies:', parsedCookies ? JSON.stringify(Object.keys(parsedCookies)) : 'undefined');
    console.log('[tRPC Context] Session cookie:', sessionCookie ? 'present' : 'missing');
    
    if (sessionCookie) {
      user = await sdk.authenticateWithCookie(sessionCookie);
      console.log('[tRPC Context] ✅ Authenticated user:', user?.openId);
    } else {
      console.log('[tRPC Context] ⚠️  No session cookie found');
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
