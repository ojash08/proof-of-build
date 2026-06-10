/**
 * tRPC router for verification operations
 * Handles repository verification requests and status tracking
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { processPendingVerifications, processVerificationJob } from "./verificationWorker";
import { getDb, getVerifiedBuildById } from "./db";
import { eq } from "drizzle-orm";
import { verifiedBuilds } from "../drizzle/schema";

export const verificationRouter = router({
  /**
   * Trigger verification of pending builds
   * This would typically be called by a scheduled job or webhook
   */
  processPending: protectedProcedure.mutation(async ({ ctx }) => {
    // Only allow admin users to trigger verification
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    try {
      await processPendingVerifications();
      return { success: true, message: "Verification processing started" };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to process verifications"
      );
    }
  }),

  /**
   * Get verification status for a build
   */
  getStatus: protectedProcedure
    .input(z.object({ buildId: z.number() }))
    .query(async ({ ctx, input }) => {
      const build = await getVerifiedBuildById(input.buildId);

      if (!build) {
        throw new Error("Build not found");
      }

      // Verify ownership or public visibility
      if (build.userId !== ctx.user?.id && !build.isPublicVisible) {
        throw new Error("Unauthorized");
      }

      return {
        id: build.id,
        status: build.status,
        complexityScore: build.complexityScore,
        architectureQuality: build.architectureQuality,
        codeQuality: build.codeQuality,
        competencies: build.competencies,
        skillTags: build.skillTags,
        verificationError: build.verificationError,
        verifiedAt: build.verifiedAt,
      };
    }),

  /**
   * Retry verification for a failed build
   */
  retryVerification: protectedProcedure
    .input(z.object({ buildId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const build = await getVerifiedBuildById(input.buildId);

      if (!build) {
        throw new Error("Build not found");
      }

      if (build.userId !== ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      if (build.status !== "failed") {
        throw new Error("Only failed builds can be retried");
      }

      // Reset status to pending for retry
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .update(verifiedBuilds)
        .set({
          status: "pending",
          verificationError: null,
        })
        .where(eq(verifiedBuilds.id, input.buildId));

      // Trigger processing asynchronously in the background
      if (typeof processVerificationJob === "function") {
        const promise = processVerificationJob(input.buildId);
        if (promise && typeof promise.catch === "function") {
          promise.catch(e => {
            console.error("Error triggering verification:", e);
          });
        }
      } else {
        try {
          await processPendingVerifications();
        } catch (e) {
          console.error("Error triggering verification:", e);
        }
      }

      return { success: true, message: "Verification retry queued" };
    }),
});
