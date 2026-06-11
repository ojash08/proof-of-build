import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  json,
  boolean
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with profile fields for the Proof of Build platform.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Profile fields for Proof of Build
  username: varchar("username", { length: 64 }).unique(), // Public username slug
  bio: text("bio"), // User bio
  avatarUrl: text("avatarUrl"), // Avatar URL
  bannerUrl: text("bannerUrl"), // Banner URL for public profile
  totalXp: int("totalXp").default(0).notNull(), // Total experience points
  currentLevel: int("currentLevel").default(1).notNull(), // Current level
  trustScore: decimal("trustScore", { precision: 5, scale: 2 }).default("0.00").notNull(), // 0-100 trust score
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Verified builds table - stores GitHub repository verifications
 */
export const verifiedBuilds = mysqlTable("verified_builds", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Repository information
  repoUrl: varchar("repoUrl", { length: 512 }).notNull(),
  repoName: varchar("repoName", { length: 256 }).notNull(),
  repoOwner: varchar("repoOwner", { length: 256 }).notNull(),
  
  // Verification metadata
  status: mysqlEnum("status", ["pending", "processing", "verified", "failed"]).default("pending").notNull(),
  verificationError: text("verificationError"), // Error message if verification failed
  
  // Verification results
  complexityScore: decimal("complexityScore", { precision: 5, scale: 2 }), // 0-100 complexity
  architectureQuality: decimal("architectureQuality", { precision: 5, scale: 2 }), // 0-100
  codeQuality: decimal("codeQuality", { precision: 5, scale: 2 }), // 0-100
  
  // Repository metadata
  description: text("description"),
  languages: json("languages"), // JSON array of languages used
  primaryLanguage: varchar("primaryLanguage", { length: 64 }),
  commitCount: int("commitCount"),
  contributorCount: int("contributorCount"),
  starCount: int("starCount"),
  
  // Competencies and skills
  competencies: json("competencies"), // JSON array of { skill_name, density_score, proof_statement }
  skillTags: json("skillTags"), // JSON array of skill tags
  
  // TEE verification
  teeSignature: text("teeSignature"), // Signed verification result from TEE
  teeTimestamp: timestamp("teeTimestamp"), // When TEE verification occurred
  
  // Public visibility
  isPublicVisible: boolean("isPublicVisible").default(true).notNull(),
  
  // Timestamps
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VerifiedBuild = typeof verifiedBuilds.$inferSelect;
export type InsertVerifiedBuild = typeof verifiedBuilds.$inferInsert;

/**
 * Competencies table - normalized competency records
 */
export const competencies = mysqlTable("competencies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  buildId: int("buildId"), // Optional reference to the verified build that proved this competency
  
  skillName: varchar("skillName", { length: 256 }).notNull(),
  densityWeight: decimal("densityWeight", { precision: 5, scale: 2 }).notNull(), // 0-100 density score
  
  // Aggregated data
  verificationCount: int("verificationCount").default(1).notNull(), // How many builds prove this skill
  lastVerifiedAt: timestamp("lastVerifiedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Competency = typeof competencies.$inferSelect;
export type InsertCompetency = typeof competencies.$inferInsert;

/**
 * Badges table - achievement badges for users
 */
export const badges = mysqlTable("badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  badgeType: mysqlEnum("badgeType", [
    "first_build",
    "verified_architect",
    "polyglot",
    "open_source_champion",
    "trusted_builder",
    "level_5",
    "level_10",
    "level_20"
  ]).notNull(),
  
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  iconUrl: text("iconUrl"),
  
  awardedAt: timestamp("awardedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

/**
 * Activity feed table - tracks user actions for the dashboard feed
 */
export const activityFeed = mysqlTable("activity_feed", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  activityType: mysqlEnum("activityType", [
    "build_verified",
    "skill_unlocked",
    "badge_earned",
    "level_up",
    "xp_gained"
  ]).notNull(),
  
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  metadata: json("metadata"), // Additional context
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityFeedEntry = typeof activityFeed.$inferSelect;
export type InsertActivityFeedEntry = typeof activityFeed.$inferInsert;
