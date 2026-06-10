import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Github, Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/**
 * Enterprise SaaS aesthetic public profile page
 * Displays verified builds and competencies for recruiters
 */
export default function PublicProfile() {
  const [, params] = useRoute("/p/:username");
  const username = params?.username as string;
  const [copied, setCopied] = useState(false);

  // tRPC queries
  const profileQuery = trpc.user.getPublicProfile.useQuery(
    { username },
    { enabled: !!username }
  );
  const buildsQuery = trpc.builds.getPublicBuilds.useQuery(
    { username },
    { enabled: !!username }
  );

  const profile = profileQuery.data;
  const builds = buildsQuery.data || [];

  // Extract competencies from builds
  const competencies = builds
    .flatMap((build: any) => {
      if (!build.competencies) return [];
      const comps = Array.isArray(build.competencies)
        ? build.competencies
        : JSON.parse(build.competencies);
      return comps.map((c: any) => ({
        ...c,
        buildId: build.id,
      }));
    })
    .reduce(
      (acc: any[], comp: any) => {
        const existing = acc.find((c) => c.skillName === comp.skillName);
        if (existing) {
          existing.density_score = Math.max(existing.density_score, comp.density_score);
          existing.count = (existing.count || 1) + 1;
        } else {
          acc.push({ ...comp, count: 1 });
        }
        return acc;
      },
      [] as any[]
    )
    .sort((a: any, b: any) => b.density_score - a.density_score);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Profile link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">The developer profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-roboto">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 font-sans">{profile.name || profile.username}</h1>
              <p className="text-gray-600 mt-2">@{profile.username}</p>
              {profile.bio && <p className="text-gray-700 mt-3 max-w-2xl">{profile.bio}</p>}
            </div>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Share2 size={18} />
              {copied ? "Copied!" : "Share"}
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section with Badge */}
      <motion.div
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border-2 border-blue-600">
              <CheckCircle2 size={20} className="text-blue-600" />
              <span className="font-semibold text-blue-600">Verified by Proof of Build</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <motion.div
              className="bg-white p-4 rounded-lg border border-gray-200"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-gray-600 text-sm font-medium">Verified Builds</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{builds.length}</div>
            </motion.div>
            <motion.div
              className="bg-white p-4 rounded-lg border border-gray-200"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-gray-600 text-sm font-medium">Skills Proven</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{competencies.length}</div>
            </motion.div>
            <motion.div
              className="bg-white p-4 rounded-lg border border-gray-200"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-gray-600 text-sm font-medium">Trust Score</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {String(profile.trustScore)}%
              </div>
            </motion.div>
            <motion.div
              className="bg-white p-4 rounded-lg border border-gray-200"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-gray-600 text-sm font-medium">Level</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{profile.currentLevel}</div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Competencies */}
          <motion.div
            className="col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-sans">Verified Competencies</h2>
            <div className="space-y-4">
              {competencies.length > 0 ? (
                competencies.map((comp: any, idx: number) => (
                  <motion.div
                    key={`${comp.skillName}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comp.skillName}
                      </span>
                      <span className="text-xs text-gray-600">
                        {Math.round(comp.density_score)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(comp.density_score, 100)}%`,
                        }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 + idx * 0.05 }}
                      />
                    </div>
                    {comp.count && comp.count > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Proven in {comp.count} project{comp.count > 1 ? "s" : ""}
                      </p>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-600 text-sm">No verified competencies yet</p>
              )}
            </div>
          </motion.div>

          {/* Right Column - Project Cards */}
          <motion.div
            className="col-span-1 md:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-sans">Verified Projects</h2>
            <div className="space-y-4">
              {builds.length > 0 ? (
                builds.map((build: any, idx: number) => (
                  <motion.div
                    key={build.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Github size={20} className="text-gray-600" />
                          {build.repoName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{build.repoOwner}</p>
                      </div>
                      <Badge
                        variant={
                          build.status === "verified"
                            ? "default"
                            : build.status === "processing"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {build.status}
                      </Badge>
                    </div>

                    {build.description && (
                      <p className="text-gray-700 text-sm mb-4">{build.description}</p>
                    )}

                    {/* Quality Metrics */}
                    {build.complexityScore && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-600 font-medium">Complexity</div>
                          <div className="text-lg font-bold text-gray-900">
                            {Math.round(parseFloat(String(build.complexityScore)))}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 font-medium">Architecture</div>
                          <div className="text-lg font-bold text-gray-900">
                            {Math.round(parseFloat(String(build.architectureQuality || "0")))}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 font-medium">Code Quality</div>
                          <div className="text-lg font-bold text-gray-900">
                            {Math.round(parseFloat(String(build.codeQuality || "0")))}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {build.skillTags && Array.isArray(build.skillTags) && (
                      <div className="flex flex-wrap gap-2">
                        {build.skillTags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Repository Link */}
                    <a
                      href={build.repoUrl as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm mt-4"
                    >
                      View Repository
                      <ExternalLink size={16} />
                    </a>
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-600">No verified projects yet</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
