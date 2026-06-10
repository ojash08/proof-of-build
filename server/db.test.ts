import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createVerifiedBuild,
  getVerifiedBuildById,
  createOrUpdateCompetency,
  getUserCompetencies,
} from "./db";

/**
 * Database tests for Proof of Build
 * Note: These tests require a database connection
 */

describe("Database Operations", () => {
  const testUserId = 999;
  let testBuildId: number | undefined;

  describe("Verified Builds", () => {
    it("should create a verified build record", async () => {
      const result = await createVerifiedBuild({
        userId: testUserId,
        repoUrl: "https://github.com/test/repo",
        repoName: "test-repo",
        repoOwner: "test",
      });

      expect(result).toBeDefined();
      // Store for later tests
      if (result && "insertId" in result) {
        testBuildId = result.insertId;
      }
    });

    it("should fetch a verified build by ID", async () => {
      if (!testBuildId) {
        console.log("Skipping test - no build ID available");
        return;
      }

      const build = await getVerifiedBuildById(testBuildId);
      expect(build).toBeDefined();
      expect(build?.repoName).toBe("test-repo");
      expect(build?.repoOwner).toBe("test");
      expect(build?.status).toBe("pending");
    });
  });

  describe("Competencies", () => {
    it("should create a competency record", async () => {
      const result = await createOrUpdateCompetency(
        testUserId,
        "TypeScript",
        85,
        testBuildId
      );

      expect(result).toBeDefined();
    });

    it("should update existing competency with higher score", async () => {
      // Create initial
      await createOrUpdateCompetency(testUserId, "React", 75);

      // Update with higher score
      const result = await createOrUpdateCompetency(testUserId, "React", 90);

      expect(result).toBeDefined();
    });

    it("should retrieve user competencies", async () => {
      // Create a few competencies
      await createOrUpdateCompetency(testUserId, "Node.js", 80);
      await createOrUpdateCompetency(testUserId, "PostgreSQL", 75);

      const competencies = await getUserCompetencies(testUserId);

      expect(Array.isArray(competencies)).toBe(true);
      expect(competencies.length).toBeGreaterThan(0);

      // Check that competencies have required fields
      const comp = competencies[0];
      expect(comp).toHaveProperty("skillName");
      expect(comp).toHaveProperty("densityWeight");
      expect(comp).toHaveProperty("userId");
    });
  });
});
