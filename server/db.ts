import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  verifiedBuilds,
  competencies,
  badges,
  activityFeed,
  type VerifiedBuild,
  type Competency,
  type Badge,
  type ActivityFeedEntry
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "username", "bio", "avatarUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized as any;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.totalXp !== undefined) {
      values.totalXp = user.totalXp;
      updateSet.totalXp = user.totalXp;
    }
    if (user.currentLevel !== undefined) {
      values.currentLevel = user.currentLevel;
      updateSet.currentLevel = user.currentLevel;
    }
    if (user.trustScore !== undefined) {
      values.trustScore = user.trustScore;
      updateSet.trustScore = user.trustScore;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, updates: {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  totalXp?: number;
  currentLevel?: number;
  trustScore?: string | number;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const sanitized: any = { ...updates };
  if (sanitized.trustScore !== undefined && typeof sanitized.trustScore === 'number') {
    sanitized.trustScore = sanitized.trustScore.toString();
  }

  const result = await db.update(users).set(sanitized).where(eq(users.id, userId));
  return result;
}

// Verified Builds queries
export async function createVerifiedBuild(build: {
  userId: number;
  repoUrl: string;
  repoName: string;
  repoOwner: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(verifiedBuilds).values({
    ...build,
    status: "pending",
  });
  
  // Return the created build with status
  const insertId = (result as any).insertId || 0;
  return {
    ...build,
    status: "pending" as const,
    id: insertId,
  };
}

export async function getVerifiedBuildById(buildId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(verifiedBuilds).where(eq(verifiedBuilds.id, buildId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserVerifiedBuilds(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(verifiedBuilds)
    .where(eq(verifiedBuilds.userId, userId))
    .orderBy(desc(verifiedBuilds.createdAt));
  
  return result;
}

export async function updateVerifiedBuild(buildId: number, updates: Partial<VerifiedBuild>) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.update(verifiedBuilds)
    .set(updates)
    .where(eq(verifiedBuilds.id, buildId));
  
  return result;
}

// Competencies queries
export async function getUserCompetencies(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(competencies)
    .where(eq(competencies.userId, userId))
    .orderBy(desc(competencies.densityWeight));
  
  return result;
}

export async function createOrUpdateCompetency(userId: number, skillName: string, densityWeight: string | number, buildId?: number) {
  const db = await getDb();
  if (!db) return undefined;

  // Check if competency already exists
  const existing = await db.select().from(competencies)
    .where(and(eq(competencies.userId, userId), eq(competencies.skillName, skillName)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    const existingWeight = parseFloat(existing[0].densityWeight.toString());
    const newWeight = typeof densityWeight === 'number' ? densityWeight : parseFloat(densityWeight);
    const result = await db.update(competencies)
      .set({
        densityWeight: Math.max(existingWeight, newWeight).toString(),
        verificationCount: (existing[0].verificationCount || 1) + 1,
        lastVerifiedAt: new Date(),
      })
      .where(eq(competencies.id, existing[0].id));
    return result;
  } else {
    // Create new
    const result = await db.insert(competencies).values({
      userId,
      skillName,
      densityWeight: typeof densityWeight === 'number' ? densityWeight.toString() : densityWeight,
      buildId,
      verificationCount: 1,
    });
    return result;
  }
}

// Badges queries
export async function getUserBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(badges)
    .where(eq(badges.userId, userId))
    .orderBy(desc(badges.awardedAt));
  
  return result;
}

export async function createBadge(userId: number, badgeType: string, title: string, description?: string, iconUrl?: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(badges).values({
    userId,
    badgeType: badgeType as any,
    title,
    description,
    iconUrl,
  });
  
  return result;
}

// Activity Feed queries
export async function getUserActivityFeed(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(activityFeed)
    .where(eq(activityFeed.userId, userId))
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit);
  
  return result;
}

export async function createActivityFeedEntry(userId: number, activityType: string, title: string, description?: string, metadata?: any) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(activityFeed).values({
    userId,
    activityType: activityType as any,
    title,
    description,
    metadata,
  });
  
  return result;
}

export async function seedDemoDataForUser(userId: number) {
  const db = await getDb();
  if (!db) return;

  // Clean up any test run builds for this user so they don't clutter the UI
  try {
    await db.delete(verifiedBuilds).where(
      and(
        eq(verifiedBuilds.userId, userId),
        eq(verifiedBuilds.repoUrl, "https://github.com/test/repo")
      )
    );
  } catch (err) {
    console.warn("[Database] Failed to clean up test builds:", err);
  }

  // Check if they already have the demo builds
  const existingBuilds = await db.select().from(verifiedBuilds)
    .where(
      and(
        eq(verifiedBuilds.userId, userId),
        eq(verifiedBuilds.repoName, "proof-of-build")
      )
    )
    .limit(1);

  if (existingBuilds.length > 0) return;

  // Insert mock verified build 1
  const build1Result = await db.insert(verifiedBuilds).values({
    userId,
    repoUrl: "https://github.com/demo/proof-of-build",
    repoName: "proof-of-build",
    repoOwner: "demo",
    status: "verified",
    complexityScore: "88.00",
    architectureQuality: "92.00",
    codeQuality: "90.00",
    description: "Verification ledger for developer builds, incorporating TEE-based cryptographic attestation and LLM analysis.",
    primaryLanguage: "TypeScript",
    languages: ["TypeScript", "React", "HTML", "CSS"],
    commitCount: 42,
    contributorCount: 2,
    starCount: 12,
    skillTags: ["TypeScript", "React", "Node.js", "TEE", "Cryptography"],
    competencies: [
      { skillName: "TypeScript", density_score: 90, proof_statement: "Used for type-safe RPC endpoints and client components." },
      { skillName: "React", density_score: 85, proof_statement: "Built interactive Framer Motion dashboard and modular components." }
    ],
    isPublicVisible: true,
    verifiedAt: new Date(),
  });

  const build1Id = (build1Result as any).insertId || 1;

  // Insert mock verified build 2
  const build2Result = await db.insert(verifiedBuilds).values({
    userId,
    repoUrl: "https://github.com/demo/hyper-ledger-attest",
    repoName: "hyper-ledger-attest",
    repoOwner: "demo",
    status: "verified",
    complexityScore: "95.00",
    architectureQuality: "94.00",
    codeQuality: "96.00",
    description: "Cryptographic attestation library for trust computation and zero-knowledge verification.",
    primaryLanguage: "Rust",
    languages: ["Rust", "WebAssembly"],
    commitCount: 118,
    contributorCount: 1,
    starCount: 84,
    skillTags: ["Rust", "Cryptography", "Security", "WebAssembly"],
    competencies: [
      { skillName: "Rust", density_score: 95, proof_statement: "Implemented zero-knowledge primitives and low-level bindings." },
      { skillName: "Cryptography", density_score: 92, proof_statement: "Attestation signature checks and hashing circuits." }
    ],
    isPublicVisible: true,
    verifiedAt: new Date(),
  });

  const build2Id = (build2Result as any).insertId || 2;

  // Insert competencies
  await createOrUpdateCompetency(userId, "TypeScript", 90, build1Id);
  await createOrUpdateCompetency(userId, "React", 85, build1Id);
  await createOrUpdateCompetency(userId, "Rust", 95, build2Id);
  await createOrUpdateCompetency(userId, "Cryptography", 92, build2Id);
}
