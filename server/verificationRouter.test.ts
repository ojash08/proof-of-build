import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * Verification Router Tests
 * Mocks the database layer and verification worker so no live DB or network is required.
 */

// ── Mock modules ───────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getVerifiedBuildById: vi.fn(),
}));

vi.mock("./verificationWorker", () => {
  return {
    processPendingVerifications: vi.fn(),
    processVerificationJob: undefined,
  };
});

// We need to mock the schema import used by verificationRouter for `eq` and `verifiedBuilds`
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

vi.mock("../drizzle/schema", () => ({
  verifiedBuilds: {
    id: "verified_builds.id",
    status: "verified_builds.status",
  },
}));

// Import after mocks are set up
import { verificationRouter } from "./verificationRouter";
import { getDb, getVerifiedBuildById } from "./db";
import { processPendingVerifications } from "./verificationWorker";

const mockGetDb = getDb as ReturnType<typeof vi.fn>;
const mockGetVerifiedBuildById = getVerifiedBuildById as ReturnType<typeof vi.fn>;
const mockProcessPending = processPendingVerifications as ReturnType<typeof vi.fn>;

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockContext(
  overrides: { userId?: number; role?: string } = {}
): TrpcContext {
  const { userId = 1, role = "user" } = overrides;

  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: `Test User ${userId}`,
      loginMethod: "manus",
      role: role as "user" | "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function makeBuild(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    repoUrl: "https://github.com/test/repo",
    repoName: "repo",
    repoOwner: "test",
    status: "verified",
    complexityScore: "85.00",
    architectureQuality: "78.00",
    codeQuality: "90.00",
    competencies: [
      { competency: "TypeScript", density_score: 90, proof_statement: "Main language" },
    ],
    skillTags: ["TypeScript", "Node.js"],
    verificationError: null,
    verifiedAt: new Date("2025-01-01"),
    isPublicVisible: true,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("verificationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── processPending ───────────────────────────────────────────────────

  describe("processPending", () => {
    it("should succeed when called by an admin user", async () => {
      mockProcessPending.mockResolvedValue(undefined);

      const caller = verificationRouter.createCaller(createMockContext({ role: "admin" }));
      const result = await caller.processPending();

      expect(result).toEqual({ success: true, message: "Verification processing started" });
      expect(mockProcessPending).toHaveBeenCalledTimes(1);
    });

    it("should throw Unauthorized when called by a non-admin user", async () => {
      const caller = verificationRouter.createCaller(createMockContext({ role: "user" }));

      await expect(caller.processPending()).rejects.toThrow("Unauthorized");
      expect(mockProcessPending).not.toHaveBeenCalled();
    });

    it("should propagate errors from processPendingVerifications", async () => {
      mockProcessPending.mockRejectedValue(new Error("Worker crashed"));

      const caller = verificationRouter.createCaller(createMockContext({ role: "admin" }));

      await expect(caller.processPending()).rejects.toThrow("Worker crashed");
    });

    it("should wrap non-Error throws in a generic message", async () => {
      mockProcessPending.mockRejectedValue("something unexpected");

      const caller = verificationRouter.createCaller(createMockContext({ role: "admin" }));

      await expect(caller.processPending()).rejects.toThrow("Failed to process verifications");
    });
  });

  // ── getStatus ────────────────────────────────────────────────────────

  describe("getStatus", () => {
    it("should return build verification status for the owner", async () => {
      const build = makeBuild({ userId: 1 });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));
      const result = await caller.getStatus({ buildId: 1 });

      expect(result.id).toBe(1);
      expect(result.status).toBe("verified");
      expect(result.complexityScore).toBe("85.00");
      expect(result.architectureQuality).toBe("78.00");
      expect(result.codeQuality).toBe("90.00");
      expect(result.competencies).toEqual(build.competencies);
      expect(result.skillTags).toEqual(["TypeScript", "Node.js"]);
      expect(result.verifiedAt).toEqual(new Date("2025-01-01"));
    });

    it("should allow access to a public build from another user", async () => {
      const build = makeBuild({ userId: 99, isPublicVisible: true });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));
      const result = await caller.getStatus({ buildId: 1 });

      expect(result.id).toBe(1);
    });

    it("should throw 'Build not found' when build does not exist", async () => {
      mockGetVerifiedBuildById.mockResolvedValue(undefined);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));

      await expect(caller.getStatus({ buildId: 999 })).rejects.toThrow("Build not found");
    });

    it("should throw Unauthorized for a private build from another user", async () => {
      const build = makeBuild({ userId: 99, isPublicVisible: false });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));

      await expect(caller.getStatus({ buildId: 1 })).rejects.toThrow("Unauthorized");
    });
  });

  // ── retryVerification ────────────────────────────────────────────────

  describe("retryVerification", () => {
    it("should reset a failed build to pending and trigger processing", async () => {
      const build = makeBuild({ userId: 1, status: "failed", verificationError: "Some error" });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockGetDb.mockResolvedValue({ update: mockUpdate });
      mockProcessPending.mockResolvedValue(undefined);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));
      const result = await caller.retryVerification({ buildId: 1 });

      expect(result).toEqual({ success: true, message: "Verification retry queued" });
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockProcessPending).toHaveBeenCalledTimes(1);
    });

    it("should throw 'Build not found' when build does not exist", async () => {
      mockGetVerifiedBuildById.mockResolvedValue(undefined);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));

      await expect(caller.retryVerification({ buildId: 999 })).rejects.toThrow("Build not found");
    });

    it("should throw Unauthorized when user does not own the build", async () => {
      const build = makeBuild({ userId: 99, status: "failed" });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));

      await expect(caller.retryVerification({ buildId: 1 })).rejects.toThrow("Unauthorized");
    });

    it("should throw when build status is not 'failed'", async () => {
      const build = makeBuild({ userId: 1, status: "verified" });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));

      await expect(caller.retryVerification({ buildId: 1 })).rejects.toThrow(
        "Only failed builds can be retried"
      );
    });

    it("should throw when build status is 'pending'", async () => {
      const build = makeBuild({ userId: 1, status: "pending" });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));

      await expect(caller.retryVerification({ buildId: 1 })).rejects.toThrow(
        "Only failed builds can be retried"
      );
    });

    it("should throw when database is not available", async () => {
      const build = makeBuild({ userId: 1, status: "failed" });
      mockGetVerifiedBuildById.mockResolvedValue(build);
      mockGetDb.mockResolvedValue(null);

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));

      await expect(caller.retryVerification({ buildId: 1 })).rejects.toThrow(
        "Database not available"
      );
    });

    it("should still succeed even if processPendingVerifications throws (error is caught)", async () => {
      const build = makeBuild({ userId: 1, status: "failed" });
      mockGetVerifiedBuildById.mockResolvedValue(build);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockGetDb.mockResolvedValue({ update: mockUpdate });
      mockProcessPending.mockRejectedValue(new Error("Worker is down"));

      const caller = verificationRouter.createCaller(createMockContext({ userId: 1 }));
      const result = await caller.retryVerification({ buildId: 1 });

      // The retry still reports success because the status was already reset
      expect(result).toEqual({ success: true, message: "Verification retry queued" });
    });
  });
});
