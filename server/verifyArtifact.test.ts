import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

/**
 * TEE Verification Tests
 * Mocks the LLM module so no network calls are made.
 */

// ── Mock the LLM module ────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Import AFTER the mock is set up so vitest resolves the mock correctly.
import { verifyRepositoryArtifact, verifyTEESignature } from "./_core/verifyArtifact";
import { invokeLLM } from "./_core/llm";

// Cast for type-safe mock control
const mockInvokeLLM = invokeLLM as ReturnType<typeof vi.fn>;

// ── Helpers ────────────────────────────────────────────────────────────────

const TEE_SECRET = "test-tee-secret";

interface TestMetadata {
  owner: string;
  name: string;
  url: string;
  description?: string;
  languages: string[];
  commitCount: number;
  contributorCount: number;
  starCount: number;
  readmeContent?: string;
}

function makeMetadata(overrides: Partial<TestMetadata> = {}): TestMetadata {
  return {
    owner: "octocat",
    name: "hello-world",
    url: "https://github.com/octocat/hello-world",
    description: "A sample project",
    languages: ["TypeScript", "JavaScript", "CSS"],
    commitCount: 200,
    contributorCount: 10,
    starCount: 150,
    readmeContent: "# Hello World\nThis is a README with enough content to test scoring. ".repeat(15),
    ...overrides,
  };
}

function makeLLMResponse(competencies: Array<{ competency: string; density_score: number; proof_statement: string }>) {
  return {
    id: "chatcmpl-mock",
    created: Date.now(),
    model: "gpt-4o-mock",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant" as const,
          content: JSON.stringify(competencies),
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

const sampleCompetencies = [
  { competency: "TypeScript", density_score: 90, proof_statement: "Primary language" },
  { competency: "Backend Development", density_score: 85, proof_statement: "Server code present" },
  { competency: "System Design", density_score: 80, proof_statement: "Architecture patterns observed" },
  { competency: "React", density_score: 75, proof_statement: "Frontend framework" },
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe("verifyRepositoryArtifact", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Successful verification ──────────────────────────────────────────

  it("should return status 'verified' on success", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    expect(result.status).toBe("verified");
    expect(result.buildId).toBe(1);
  });

  it("should include competencies from the LLM response", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    expect(result.competencies).toHaveLength(4);
    expect(result.competencies[0].competency).toBe("TypeScript");
    expect(result.competencies[0].density_score).toBe(90);
  });

  it("should extract skill tags (up to 5) from competencies", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    expect(result.skillTags).toEqual(["TypeScript", "Backend Development", "System Design", "React"]);
    expect(result.skillTags.length).toBeLessThanOrEqual(5);
  });

  it("should include a TEE signature (non-empty hex string)", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    expect(result.teeSignature).toBeTruthy();
    expect(result.teeSignature).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
  });

  it("should include a teeTimestamp as a Date", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    expect(result.teeTimestamp).toBeInstanceOf(Date);
  });

  // ── Complexity score calculation ─────────────────────────────────────

  it("should produce a higher complexity score for repos with more commits", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const lowCommits = await verifyRepositoryArtifact(
      1,
      makeMetadata({ commitCount: 5 }),
      TEE_SECRET
    );
    const highCommits = await verifyRepositoryArtifact(
      2,
      makeMetadata({ commitCount: 500 }),
      TEE_SECRET
    );

    expect(highCommits.complexityScore).toBeGreaterThanOrEqual(lowCommits.complexityScore);
  });

  it("should give higher complexity score when description and README are present", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const withDocs = await verifyRepositoryArtifact(
      1,
      makeMetadata({ description: "Has description", readmeContent: "README present" }),
      TEE_SECRET
    );
    const withoutDocs = await verifyRepositoryArtifact(
      2,
      makeMetadata({ description: undefined, readmeContent: undefined }),
      TEE_SECRET
    );

    expect(withDocs.complexityScore).toBeGreaterThan(withoutDocs.complexityScore);
  });

  it("should cap complexity score at 100", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result = await verifyRepositoryArtifact(
      1,
      makeMetadata({
        commitCount: 99999,
        contributorCount: 99999,
        languages: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
        starCount: 99999,
        description: "Desc",
        readmeContent: "README",
      }),
      TEE_SECRET
    );

    expect(result.complexityScore).toBeLessThanOrEqual(100);
  });

  // ── Architecture quality calculation ─────────────────────────────────

  it("should include architecture keyword competencies in score calculation", async () => {
    const archCompetencies = [
      { competency: "System Design", density_score: 90, proof_statement: "..." },
      { competency: "Microservices Architecture", density_score: 85, proof_statement: "..." },
      { competency: "Performance Optimization", density_score: 80, proof_statement: "..." },
    ];
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(archCompetencies));

    const withArch = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    // Compare against no architecture keywords
    const plainCompetencies = [
      { competency: "JavaScript", density_score: 90, proof_statement: "..." },
      { competency: "React", density_score: 85, proof_statement: "..." },
      { competency: "CSS", density_score: 80, proof_statement: "..." },
    ];
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(plainCompetencies));

    const withoutArch = await verifyRepositoryArtifact(2, makeMetadata(), TEE_SECRET);

    expect(withArch.architectureQuality).toBeGreaterThan(withoutArch.architectureQuality);
  });

  it("should cap architecture quality at 100", async () => {
    const manyArchCompetencies = [
      { competency: "System Design", density_score: 90, proof_statement: "..." },
      { competency: "Architecture patterns", density_score: 85, proof_statement: "..." },
      { competency: "Scalability engineering", density_score: 80, proof_statement: "..." },
      { competency: "Performance tuning", density_score: 75, proof_statement: "..." },
    ];
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(manyArchCompetencies));

    const result = await verifyRepositoryArtifact(
      1,
      makeMetadata({ contributorCount: 99999, languages: Array(20).fill("lang") }),
      TEE_SECRET
    );

    expect(result.architectureQuality).toBeLessThanOrEqual(100);
  });

  // ── Code quality calculation ─────────────────────────────────────────

  it("should produce higher code quality score for repos with more stars and contributors", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const low = await verifyRepositoryArtifact(
      1,
      makeMetadata({ starCount: 1, contributorCount: 1, commitCount: 1 }),
      TEE_SECRET
    );
    const high = await verifyRepositoryArtifact(
      2,
      makeMetadata({ starCount: 500, contributorCount: 50, commitCount: 500 }),
      TEE_SECRET
    );

    expect(high.codeQuality).toBeGreaterThan(low.codeQuality);
  });

  it("should give bonus code quality for long README content", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const shortReadme = await verifyRepositoryArtifact(
      1,
      makeMetadata({ readmeContent: "short" }),
      TEE_SECRET
    );
    const longReadme = await verifyRepositoryArtifact(
      2,
      makeMetadata({ readmeContent: "x".repeat(600) }),
      TEE_SECRET
    );

    expect(longReadme.codeQuality).toBeGreaterThan(shortReadme.codeQuality);
  });

  it("should cap code quality at 100", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result = await verifyRepositoryArtifact(
      1,
      makeMetadata({
        commitCount: 99999,
        starCount: 99999,
        contributorCount: 99999,
        readmeContent: "x".repeat(1000),
      }),
      TEE_SECRET
    );

    expect(result.codeQuality).toBeLessThanOrEqual(100);
  });

  // ── HMAC signature ───────────────────────────────────────────────────

  it("should produce a deterministic HMAC signature for the same inputs", async () => {
    // Freeze time to ensure the same timestamp
    const frozenDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers({ now: frozenDate });

    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    const result1 = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);
    const result2 = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    // Same buildId, same metadata, same frozen time → same signature
    expect(result1.teeSignature).toBe(result2.teeSignature);

    vi.useRealTimers();
  });

  // ── Error handling ────────────────────────────────────────────────────

  it("should return status 'failed' when LLM call throws", async () => {
    mockInvokeLLM.mockRejectedValue(new Error("LLM unavailable"));

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    expect(result.status).toBe("failed");
    expect(result.error).toBe("LLM unavailable");
    expect(result.complexityScore).toBe(0);
    expect(result.architectureQuality).toBe(0);
    expect(result.codeQuality).toBe(0);
    expect(result.competencies).toEqual([]);
    expect(result.skillTags).toEqual([]);
    expect(result.teeSignature).toBe("");
  });

  it("should return failed with 'Unknown error' when a non-Error is thrown", async () => {
    mockInvokeLLM.mockRejectedValue("something weird");

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Unknown error");
  });

  it("should handle LLM returning non-JSON content gracefully", async () => {
    const badResponse = makeLLMResponse([]);
    badResponse.choices[0].message.content = "This is not JSON at all";
    mockInvokeLLM.mockResolvedValue(badResponse);

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    // Should still return verified but with empty competencies
    expect(result.status).toBe("verified");
    expect(result.competencies).toEqual([]);
  });

  it("should handle LLM returning null content gracefully", async () => {
    const nullResponse = makeLLMResponse([]);
    nullResponse.choices[0].message.content = null as any;
    mockInvokeLLM.mockResolvedValue(nullResponse);

    const result = await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    // null content → typeof check fails → falls back to "[]"
    expect(result.status).toBe("verified");
    expect(result.competencies).toEqual([]);
  });

  // ── TEE console.log output verification ──────────────────────────────

  it("should log TEE enclave lifecycle messages", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    const logs = (consoleSpy.mock.calls as string[][]).map(args => args[0]);
    expect(logs).toContain("[TEE Enclave Initiated]");
    expect(logs).toContain("[TEE] Sanitized metadata prepared for analysis");
    expect(logs).toContain("[TEE] Invoking LLM for competency analysis...");
    expect(logs).toContain("[TEE] LLM response received");
    expect(logs).toContain("[TEE] Signature generated and verified");
    expect(logs).toContain("[TEE Enclave Completed - Verification Successful]");
  });

  it("should log the artifact name during TEE processing", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    await verifyRepositoryArtifact(1, makeMetadata({ owner: "alice", name: "my-app" }), TEE_SECRET);

    const logs = (consoleSpy.mock.calls as string[][]).map(args => args[0]);
    expect(logs).toContain("[TEE] Processing artifact: alice/my-app");
  });

  it("should log the number of identified competencies", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    await verifyRepositoryArtifact(1, makeMetadata(), TEE_SECRET);

    const logs = (consoleSpy.mock.calls as string[][]).map(args => args[0]);
    expect(logs).toContain("[TEE] Identified 4 competencies");
  });

  // ── Readme truncation ────────────────────────────────────────────────

  it("should truncate readme content to 2000 characters in the prompt sent to LLM", async () => {
    const longReadme = "x".repeat(5000);
    mockInvokeLLM.mockResolvedValue(makeLLMResponse(sampleCompetencies));

    await verifyRepositoryArtifact(1, makeMetadata({ readmeContent: longReadme }), TEE_SECRET);

    // Verify the prompt sent to LLM has truncated readme
    const prompt = mockInvokeLLM.mock.calls[0][0].messages[0].content as string;
    // The readme in the prompt should not exceed 2000 chars; the full readme is 5000
    expect(prompt).not.toContain("x".repeat(3000));
  });
});

// ── verifyTEESignature ─────────────────────────────────────────────────────

describe("verifyTEESignature", () => {
  it("should return true for a matching signature", () => {
    const data = { buildId: 1, score: 80 };
    const dataString = JSON.stringify(data);
    const hmac = crypto.createHmac("sha256", TEE_SECRET);
    hmac.update(dataString);
    const signature = hmac.digest("hex");

    expect(verifyTEESignature(data, signature, TEE_SECRET)).toBe(true);
  });

  it("should return false for a mismatched signature", () => {
    const data = { buildId: 1, score: 80 };
    const wrongSignature = "a".repeat(64);

    expect(verifyTEESignature(data, wrongSignature, TEE_SECRET)).toBe(false);
  });

  it("should return false when the secret is different", () => {
    const data = { buildId: 1, score: 80 };
    const dataString = JSON.stringify(data);
    const hmac = crypto.createHmac("sha256", TEE_SECRET);
    hmac.update(dataString);
    const signature = hmac.digest("hex");

    expect(verifyTEESignature(data, signature, "wrong-secret")).toBe(false);
  });

  it("should throw when signature lengths differ (timingSafeEqual constraint)", () => {
    const data = { buildId: 1 };
    const shortSig = "abc"; // Wrong length

    expect(() => verifyTEESignature(data, shortSig, TEE_SECRET)).toThrow();
  });
});
