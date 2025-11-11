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
    console.log('[tRPC Context] Cookie header:', opts.req.headers.cookie);
    console.log('[tRPC Context] Parsed cookies:', (opts.req as any).cookies);
    user = await sdk.authenticateRequest(opts.req);
    console.log('[tRPC Context] Authenticated user:', user?.openId);
  } catch (error) {
    // Authentication is optional for public procedures.
    console.log('[tRPC Context] Authentication failed:', error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
