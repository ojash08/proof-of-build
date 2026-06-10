import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRepositoryMetadata } from "./_core/githubApi";

/**
 * GitHub API Tests
 * Mocks global fetch to test repository metadata extraction without network calls.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** Minimal GitHub repo response payload. */
function makeRepoPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "my-repo",
    owner: { login: "octocat" },
    description: "A cool project",
    url: "https://api.github.com/repos/octocat/my-repo",
    languages_url: "https://api.github.com/repos/octocat/my-repo/languages",
    commits_url:
      "https://api.github.com/repos/octocat/my-repo/commits{/sha}",
    contributors_url:
      "https://api.github.com/repos/octocat/my-repo/contributors",
    stargazers_count: 42,
    language: "TypeScript",
    ...overrides,
  };
}

/** Create a mock Response object. */
function mockResponse(
  body: unknown,
  {
    ok = true,
    status = 200,
    headers = new Headers(),
    asText = false,
  }: {
    ok?: boolean;
    status?: number;
    headers?: Headers;
    asText?: boolean;
  } = {}
): Response {
  return {
    ok,
    status,
    headers,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

/**
 * Standard mock-fetch setup that returns valid responses for all 5 endpoints:
 *   1. repo info
 *   2. languages
 *   3. commits (per_page=1)
 *   4. contributors (per_page=1)
 *   5. readme
 */
function setupHappyFetch({
  commitLinkHeader,
  contributorLinkHeader,
  readmeText = "# My Repo\nThis is a README",
  languages = { TypeScript: 50000, JavaScript: 20000, CSS: 5000 },
}: {
  commitLinkHeader?: string;
  contributorLinkHeader?: string;
  readmeText?: string;
  languages?: Record<string, number>;
} = {}) {
  const commitHeaders = new Headers();
  if (commitLinkHeader) commitHeaders.set("Link", commitLinkHeader);

  const contributorHeaders = new Headers();
  if (contributorLinkHeader)
    contributorHeaders.set("Link", contributorLinkHeader);

  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const urlStr = url.toString();
    if (urlStr.includes("/repos/") && urlStr.includes("/languages")) {
      return Promise.resolve(mockResponse(languages));
    }
    if (urlStr.includes("/commits?per_page=1")) {
      return Promise.resolve(
        mockResponse([], { headers: commitHeaders })
      );
    }
    if (urlStr.includes("/contributors?per_page=1")) {
      return Promise.resolve(
        mockResponse([], { headers: contributorHeaders })
      );
    }
    if (urlStr.includes("/readme")) {
      return Promise.resolve(mockResponse(readmeText, { asText: true }));
    }
    // Default: repo info endpoint
    return Promise.resolve(mockResponse(makeRepoPayload()));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("fetchRepositoryMetadata", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Success path ──────────────────────────────────────────────────────

  it("should return the correct owner, name, and URL", async () => {
    setupHappyFetch();

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.owner).toBe("octocat");
    expect(result.name).toBe("my-repo");
    expect(result.url).toBe("https://github.com/octocat/my-repo");
  });

  it("should return the repository description", async () => {
    setupHappyFetch();

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.description).toBe("A cool project");
  });

  it("should return the star count from the repo response", async () => {
    setupHappyFetch();

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.starCount).toBe(42);
  });

  it("should return languages sorted by byte-count descending", async () => {
    setupHappyFetch({
      languages: { CSS: 5000, TypeScript: 50000, JavaScript: 20000 },
    });

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    // TypeScript (50k) > JavaScript (20k) > CSS (5k)
    expect(result.languages).toEqual(["TypeScript", "JavaScript", "CSS"]);
  });

  it("should return the README content", async () => {
    setupHappyFetch({ readmeText: "# Hello World" });

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.readmeContent).toBe("# Hello World");
  });

  // ── Commit count extraction from Link header ─────────────────────────

  it("should extract commit count from Link header last page", async () => {
    setupHappyFetch({
      commitLinkHeader:
        '<https://api.github.com/repos/octocat/my-repo/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repos/octocat/my-repo/commits?per_page=1&page=142>; rel="last"',
    });

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.commitCount).toBe(142);
  });

  it("should default to 1 commit when no Link header is present", async () => {
    setupHappyFetch(); // no commitLinkHeader → no Link header

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.commitCount).toBe(1);
  });

  // ── Contributor count extraction from Link header ─────────────────────

  it("should extract contributor count from Link header last page", async () => {
    setupHappyFetch({
      contributorLinkHeader:
        '<https://api.github.com/repos/octocat/my-repo/contributors?per_page=1&page=2>; rel="next", <https://api.github.com/repos/octocat/my-repo/contributors?per_page=1&page=25>; rel="last"',
    });

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.contributorCount).toBe(25);
  });

  it("should default to 1 contributor when no Link header is present", async () => {
    setupHappyFetch();

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.contributorCount).toBe(1);
  });

  // ── All 5 fetch calls are made ───────────────────────────────────────

  it("should call fetch exactly 5 times (repo, languages, commits, contributors, readme)", async () => {
    const fetchMock = setupHappyFetch();

    await fetchRepositoryMetadata("octocat", "my-repo");

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  // ── No source code in output ─────────────────────────────────────────

  it("should not include any source code fields in the returned metadata", async () => {
    setupHappyFetch();

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    // The output should only have: owner, name, url, description, languages, commitCount,
    // contributorCount, starCount, readmeContent
    const keys = Object.keys(result);
    expect(keys).toEqual(
      expect.arrayContaining([
        "owner",
        "name",
        "url",
        "description",
        "languages",
        "commitCount",
        "contributorCount",
        "starCount",
        "readmeContent",
      ])
    );

    // Ensure no source-code-like fields leak through
    expect(result).not.toHaveProperty("content");
    expect(result).not.toHaveProperty("sourceCode");
    expect(result).not.toHaveProperty("files");
    expect(result).not.toHaveProperty("tree");
  });

  // ── Error handling ────────────────────────────────────────────────────

  it("should throw when the repo info request returns a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(null, { ok: false, status: 404 })
      )
    );

    await expect(
      fetchRepositoryMetadata("octocat", "nonexistent")
    ).rejects.toThrow("GitHub API error: 404");
  });

  it("should throw when the repo info fetch rejects entirely", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    await expect(
      fetchRepositoryMetadata("octocat", "my-repo")
    ).rejects.toThrow("Network failure");
  });

  it("should use an empty object for languages when the languages endpoint fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/languages")) {
        return Promise.resolve(mockResponse({}, { ok: false, status: 403 }));
      }
      if (urlStr.includes("/commits?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      if (urlStr.includes("/contributors?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      if (urlStr.includes("/readme")) {
        return Promise.resolve(mockResponse(""));
      }
      return Promise.resolve(mockResponse(makeRepoPayload()));
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    // Languages should be empty when the endpoint returned not-ok
    expect(result.languages).toEqual([]);
  });

  it("should handle missing README gracefully (readme fetch throws)", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/readme")) {
        return Promise.reject(new Error("Not Found"));
      }
      if (urlStr.includes("/languages")) {
        return Promise.resolve(mockResponse({ TypeScript: 1000 }));
      }
      if (urlStr.includes("/commits?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      if (urlStr.includes("/contributors?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      return Promise.resolve(mockResponse(makeRepoPayload()));
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    // Should not throw; readmeContent falls back to ""
    expect(result.readmeContent).toBe("");
  });

  it("should handle readme returning non-ok response gracefully", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/readme")) {
        return Promise.resolve(mockResponse("", { ok: false, status: 404 }));
      }
      if (urlStr.includes("/languages")) {
        return Promise.resolve(mockResponse({ TypeScript: 1000 }));
      }
      if (urlStr.includes("/commits?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      if (urlStr.includes("/contributors?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      return Promise.resolve(mockResponse(makeRepoPayload()));
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.readmeContent).toBe("");
  });

  // ── Zero counts when endpoints return non-ok ─────────────────────────

  it("should return 0 commitCount when commits endpoint fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/commits?per_page=1")) {
        return Promise.resolve(mockResponse(null, { ok: false, status: 500 }));
      }
      if (urlStr.includes("/languages")) {
        return Promise.resolve(mockResponse({}));
      }
      if (urlStr.includes("/contributors?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      if (urlStr.includes("/readme")) {
        return Promise.resolve(mockResponse(""));
      }
      return Promise.resolve(mockResponse(makeRepoPayload()));
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.commitCount).toBe(0);
  });

  it("should return 0 contributorCount when contributors endpoint fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/contributors?per_page=1")) {
        return Promise.resolve(mockResponse(null, { ok: false, status: 500 }));
      }
      if (urlStr.includes("/languages")) {
        return Promise.resolve(mockResponse({}));
      }
      if (urlStr.includes("/commits?per_page=1")) {
        return Promise.resolve(mockResponse([]));
      }
      if (urlStr.includes("/readme")) {
        return Promise.resolve(mockResponse(""));
      }
      return Promise.resolve(mockResponse(makeRepoPayload()));
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRepositoryMetadata("octocat", "my-repo");

    expect(result.contributorCount).toBe(0);
  });

  // ── Correct headers are sent ─────────────────────────────────────────

  it("should send the correct Accept and User-Agent headers for all requests", async () => {
    const fetchMock = setupHappyFetch();

    await fetchRepositoryMetadata("octocat", "my-repo");

    // All calls except README should use application/vnd.github.v3+json
    const nonReadmeCalls = fetchMock.mock.calls.filter(
      ([url]: [string]) => !url.includes("/readme")
    );
    for (const [, opts] of nonReadmeCalls) {
      expect(opts.headers).toMatchObject({
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Proof-of-Build",
      });
    }

    // README uses application/vnd.github.v3.raw
    const readmeCall = fetchMock.mock.calls.find(([url]: [string]) =>
      url.includes("/readme")
    );
    expect(readmeCall).toBeDefined();
    expect(readmeCall![1].headers).toMatchObject({
      Accept: "application/vnd.github.v3.raw",
      "User-Agent": "Proof-of-Build",
    });
  });
});
