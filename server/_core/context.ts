import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getAuth } from "@clerk/express";
import * as db from "../db";

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
    const devToken = opts.req.headers["x-dev-auth-token"];
    if (process.env.NODE_ENV === "development" && devToken && typeof devToken === "string") {
      const username = devToken.trim();
      user = (await db.getUserByUsername(username)) || null;
      if (!user) {
        await db.upsertUser({
          openId: `dev-${username}`,
          name: `${username} (Dev)`,
          email: `${username}@example.com`,
          loginMethod: "dev_bypass",
          username: username,
          totalXp: 1250,
          currentLevel: 5,
          trustScore: "85.00",
          role: "user",
        });
        user = (await db.getUserByUsername(username)) || null;
      }
    } else {
      const auth = getAuth(opts.req);
      
      if (auth.userId) {
        // Find the user by Clerk userId (which we store in openId)
        user = (await db.getUserByOpenId(auth.userId)) || null;
        
        // Auto-provision user if they don't exist in our DB yet
        if (!user) {
          await db.upsertUser({
            openId: auth.userId,
            name: "User", // Clerk webhook or client usually sets this
            email: null,
            loginMethod: "clerk",
            lastSignedIn: new Date(),
          });
          user = (await db.getUserByOpenId(auth.userId)) || null;
        }
      }
    }
  } catch (error) {
    console.error("[Context Auth Error]", error);
    // Authentication is optional for public procedures.
    user = null;
  }

  if (opts.req.headers.authorization && !user) {
     console.log("[Context Auth Debug] User is null despite authorization header! auth.userId:", getAuth(opts.req).userId);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
