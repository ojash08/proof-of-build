import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * tRPC Router Tests
 */

function createMockContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: `Test User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

describe("tRPC Routers", () => {
  describe("auth router", () => {
    it("should return current user from auth.me", async () => {
      const ctx = createMockContext(42);
      const caller = appRouter.createCaller(ctx);

      const user = await caller.auth.me();

      expect(user).toBeDefined();
      expect(user?.id).toBe(42);
      expect(user?.email).toBe("user42@example.com");
    });

    it("should logout successfully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
    });
  });

  describe("user router", () => {
    it("should get user profile", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const profile = await caller.user.getProfile();

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(1);
    });

    it("should update user profile", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.user.updateProfile({
        username: "testuser",
        bio: "Test bio",
      });

      expect(result).toEqual({ success: true });
    });

    it("should get user competencies", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const competencies = await caller.user.getCompetencies();

      expect(Array.isArray(competencies)).toBe(true);
    });

    it("should get user badges", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const badges = await caller.user.getBadges();

      expect(Array.isArray(badges)).toBe(true);
    });
  });

  describe("builds router", () => {
    it("should submit a repository", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.builds.submitRepository({
        repoUrl: "https://github.com/test/repo",
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("pending");
    });

    it("should get user builds", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const builds = await caller.builds.getUserBuilds();

      expect(Array.isArray(builds)).toBe(true);
    });
  });
});
