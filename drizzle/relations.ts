import { relations } from "drizzle-orm";
import { users, verifiedBuilds, competencies, badges, activityFeed } from "./schema";

/**
 * Drizzle relations between all 5 tables
 * Enables the relational query API (db.query.users.findMany({ with: { builds: true } }))
 */

export const usersRelations = relations(users, ({ many }) => ({
  builds: many(verifiedBuilds),
  competencies: many(competencies),
  badges: many(badges),
  activityFeed: many(activityFeed),
}));

export const verifiedBuildsRelations = relations(verifiedBuilds, ({ one, many }) => ({
  user: one(users, {
    fields: [verifiedBuilds.userId],
    references: [users.id],
  }),
  competencies: many(competencies),
}));

export const competenciesRelations = relations(competencies, ({ one }) => ({
  user: one(users, {
    fields: [competencies.userId],
    references: [users.id],
  }),
  build: one(verifiedBuilds, {
    fields: [competencies.buildId],
    references: [verifiedBuilds.id],
  }),
}));

export const badgesRelations = relations(badges, ({ one }) => ({
  user: one(users, {
    fields: [badges.userId],
    references: [users.id],
  }),
}));

export const activityFeedRelations = relations(activityFeed, ({ one }) => ({
  user: one(users, {
    fields: [activityFeed.userId],
    references: [users.id],
  }),
}));
