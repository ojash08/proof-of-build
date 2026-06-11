/**
 * Background worker for repository verification
 * Processes verification jobs asynchronously
 */

import { getDb, updateVerifiedBuild, createOrUpdateCompetency, getUserById } from "./db";
import { verifyRepositoryArtifact } from "./_core/verifyArtifact";
import { fetchRepositoryMetadata } from "./_core/githubApi";
import { eq } from "drizzle-orm";
import { verifiedBuilds } from "../drizzle/schema";

const TEE_SECRET = process.env.TEE_SECRET || "proof-of-build-tee-secret";

/**
 * Process a single verification job
 */
export async function processVerificationJob(buildId: number) {
  const db = await getDb();
  if (!db) {
    console.error("[Verification Worker] Database not available");
    return;
  }

  try {
    // Fetch the build record
    const buildResult = await db
      .select()
      .from(verifiedBuilds)
      .where(eq(verifiedBuilds.id, buildId))
      .limit(1);

    if (buildResult.length === 0) {
      console.error(`[Verification Worker] Build ${buildId} not found`);
      return;
    }

    const build = buildResult[0];

    // Update status to processing
    await updateVerifiedBuild(buildId, {
      status: "processing",
    });

    console.log(`[Verification Worker] Processing build ${buildId}: ${build.repoOwner}/${build.repoName}`);

    try {
      // Fetch user to verify ownership
      const user = await getUserById(build.userId);
      if (!user || !user.username) {
        throw new Error("Ownership verification failed: Your account does not have a linked GitHub username.");
      }

      // Fetch repository metadata from GitHub
      const metadata = await fetchRepositoryMetadata(build.repoOwner, build.repoName);

      // Verify ownership
      const isOwner = metadata.owner.toLowerCase() === user.username.toLowerCase();
      const isContributor = metadata.contributors && metadata.contributors.some((c: string) => c.toLowerCase() === user.username!.toLowerCase());
      
      if (!isOwner && !isContributor) {
        throw new Error(`Ownership verification failed: Your username (@${user.username}) is not recognized as the owner or a contributor of this repository.`);
      }

      // Run TEE verification
      const teeResult = await verifyRepositoryArtifact(buildId, metadata, TEE_SECRET);

      if (teeResult.status === "verified") {
        // Update build with verification results
        await updateVerifiedBuild(buildId, {
          status: "verified",
          complexityScore: teeResult.complexityScore.toString(),
          architectureQuality: teeResult.architectureQuality.toString(),
          codeQuality: teeResult.codeQuality.toString(),
          competencies: teeResult.competencies,
          skillTags: teeResult.skillTags,
          teeSignature: teeResult.teeSignature,
          teeTimestamp: teeResult.teeTimestamp,
          languages: metadata.languages,
          primaryLanguage: metadata.languages[0],
          commitCount: metadata.commitCount,
          contributorCount: metadata.contributorCount,
          starCount: metadata.starCount,
          description: metadata.description,
        });

        // Create competency records
        for (const comp of teeResult.competencies) {
          await createOrUpdateCompetency(
            build.userId,
            comp.competency,
            comp.density_score,
            buildId
          );
        }

        console.log(`[Verification Worker] Build ${buildId} verified successfully`);
      } else {
        await updateVerifiedBuild(buildId, {
          status: "failed",
          verificationError: teeResult.error || "Verification failed",
        });

        console.error(`[Verification Worker] Build ${buildId} verification failed: ${teeResult.error}`);
      }
    } catch (innerError: any) {
      console.error(`[Verification Worker] Inner error processing build ${buildId}:`, innerError);
      await updateVerifiedBuild(buildId, {
        status: "failed",
        verificationError: innerError?.message || "An unexpected error occurred during processing",
      });
    }
  } catch (error) {
    console.error(`[Verification Worker] Error processing build ${buildId}:`, error);

    // Update build with error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await updateVerifiedBuild(buildId, {
      status: "failed",
      verificationError: errorMessage,
    });
  }
}

/**
 * Process all pending verification jobs
 */
export async function processPendingVerifications() {
  const db = await getDb();
  if (!db) {
    console.error("[Verification Worker] Database not available");
    return;
  }

  try {
    const pendingBuilds = await db
      .select()
      .from(verifiedBuilds)
      .where(eq(verifiedBuilds.status, "pending"));

    console.log(`[Verification Worker] Found ${pendingBuilds.length} pending builds`);

    for (const build of pendingBuilds) {
      await processVerificationJob(build.id);
    }
  } catch (error) {
    console.error("[Verification Worker] Error processing pending verifications:", error);
  }
}
