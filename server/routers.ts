import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { verificationRouter } from "./verificationRouter";
import { z } from "zod";
import {
  createVerifiedBuild,
  getVerifiedBuildById,
  getUserVerifiedBuilds,
  updateVerifiedBuild,
  getUserCompetencies,
  createOrUpdateCompetency,
  getUserBadges,
  getUserActivityFeed,
  createActivityFeedEntry,
  getUserById,
  updateUserProfile,
  getUserByUsername,
  upsertUser,
  seedDemoDataForUser,
} from "./db";
import { processVerificationJob } from "./verificationWorker";

export const appRouter = router({
  system: systemRouter,
  verification: verificationRouter,

  auth: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      return { success: true };
    }),
  }),

  // User profile procedures
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const dbUser = await getUserById(ctx.user.id);
      return dbUser || ctx.user;
    }),

    getPublicProfile: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const user = await getUserByUsername(input.username);
        return user;
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        username: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    getCompetencies: protectedProcedure.query(async ({ ctx }) => {
      return await getUserCompetencies(ctx.user.id);
    }),

    getBadges: protectedProcedure.query(async ({ ctx }) => {
      return await getUserBadges(ctx.user.id);
    }),

    getActivityFeed: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await getUserActivityFeed(ctx.user.id, input.limit);
      }),
  }),

  // Verified builds procedures
  builds: router({
    submitRepository: protectedProcedure
      .input(z.object({
        repoUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Parse GitHub URL to extract owner and repo name
        const urlMatch = input.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!urlMatch) {
          throw new Error("Invalid GitHub repository URL");
        }

        const [, owner, repo] = urlMatch;
        const repoName = repo.replace(/\.git$/, "");

        // Check if build already exists for this user and repo
        const existingBuilds = await getUserVerifiedBuilds(ctx.user.id);
        const existingBuild = existingBuilds.find(b => b.repoOwner.toLowerCase() === owner.toLowerCase() && b.repoName.toLowerCase() === repoName.toLowerCase());

        let buildId: number;
        let result: any;

        if (existingBuild) {
          if (existingBuild.status === "pending" || existingBuild.status === "processing") {
            throw new Error("This repository is already being verified.");
          }
          
          // Reset existing build
          await updateVerifiedBuild(existingBuild.id, {
            status: "pending",
            verificationError: null,
            submittedAt: new Date(),
          } as any);
          
          buildId = existingBuild.id;
          result = { ...existingBuild, status: "pending" };
        } else {
          // Create pending build record
          result = await createVerifiedBuild({
            userId: ctx.user.id,
            repoUrl: input.repoUrl,
            repoName,
            repoOwner: owner,
          });
          buildId = result?.id;
        }

        if (buildId && typeof processVerificationJob === "function") {
          // Process verification asynchronously in the background
          const promise = processVerificationJob(buildId);
          if (promise && typeof promise.catch === "function") {
            promise.catch(err => {
              console.error(`[Verification] Error starting job ${buildId}:`, err);
            });
          }
        }

        // Log activity
        await createActivityFeedEntry(
          ctx.user.id,
          "build_verified",
          `Repository submission: ${repoName}`,
          existingBuild ? `Re-submitted ${repoName} for verification` : `Submitted ${repoName} for verification`,
          { repoUrl: input.repoUrl }
        );

        return result;
      }),

    getUserBuilds: protectedProcedure.query(async ({ ctx }) => {
      return await getUserVerifiedBuilds(ctx.user.id);
    }),

    getBuildById: protectedProcedure
      .input(z.object({ buildId: z.number() }))
      .query(async ({ ctx, input }) => {
        const build = await getVerifiedBuildById(input.buildId);
        
        // Verify ownership
        if (build && build.userId !== ctx.user.id && !build.isPublicVisible) {
          throw new Error("Unauthorized");
        }

        return build;
      }),

    getPublicBuilds: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const user = await getUserByUsername(input.username);
        if (!user) return [];

        const builds = await getUserVerifiedBuilds(user.id);
        return builds.filter(b => b.isPublicVisible && b.status === "verified");
      }),

    updateBuildStatus: protectedProcedure
      .input(z.object({
        buildId: z.number(),
        status: z.enum(["pending", "processing", "verified", "failed"]),
        complexityScore: z.number().optional(),
        architectureQuality: z.number().optional(),
        codeQuality: z.number().optional(),
        competencies: z.any().optional(),
        skillTags: z.array(z.string()).optional(),
        teeSignature: z.string().optional(),
        verificationError: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const build = await getVerifiedBuildById(input.buildId);
        
        if (!build || build.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const updates: any = {
          status: input.status,
        };

        if (input.complexityScore !== undefined) {
          updates.complexityScore = input.complexityScore.toString();
        }
        if (input.architectureQuality !== undefined) {
          updates.architectureQuality = input.architectureQuality.toString();
        }
        if (input.codeQuality !== undefined) {
          updates.codeQuality = input.codeQuality.toString();
        }
        if (input.competencies !== undefined) {
          updates.competencies = input.competencies;
        }
        if (input.skillTags !== undefined) {
          updates.skillTags = input.skillTags;
        }
        if (input.teeSignature !== undefined) {
          updates.teeSignature = input.teeSignature;
        }
        if (input.verificationError !== undefined) {
          updates.verificationError = input.verificationError;
        }
        if (input.status === "verified") {
          updates.verifiedAt = new Date();
        }

        return await updateVerifiedBuild(input.buildId, updates);
      }),

    addCompetencies: protectedProcedure
      .input(z.object({
        buildId: z.number(),
        competencies: z.array(z.object({
          skillName: z.string(),
          densityWeight: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const build = await getVerifiedBuildById(input.buildId);
        
        if (!build || build.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        // Create or update competencies
        for (const comp of input.competencies) {
          await createOrUpdateCompetency(
            ctx.user.id,
            comp.skillName,
            comp.densityWeight,
            input.buildId
          );
        }

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
