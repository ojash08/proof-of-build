import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Github, Share2, ExternalLink, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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
        skillName: c.skillName || c.competency,
        density_score: c.density_score || c.score || 0,
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

  const chartData = competencies.slice(0, 8).map((c: any) => ({
    subject: c.skillName || "Unknown",
    score: Math.round(Math.min(c.density_score, 100)),
    fullMark: 100,
  }));

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Profile link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500/30 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-900/50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">Profile Not Found</h1>
          <p className="text-zinc-400">The developer profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Banner */}
      {profile.bannerUrl && (
        <div 
          className="h-64 w-full bg-cover bg-center border-b border-white/10 print:h-48 print:break-after-avoid" 
          style={{ backgroundImage: `url(${profile.bannerUrl})` }}
        />
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-transparent">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-100 font-sans">{profile.name || profile.username}</h1>
              <p className="text-zinc-400 mt-2">@{profile.username}</p>
              {profile.bio && <p className="text-zinc-300 mt-3 max-w-2xl">{profile.bio}</p>}
            </div>
            <div className="flex gap-3 print:hidden">
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer size={18} />
                Export
              </Button>
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
      </div>

      {/* Hero Section with Badge */}
      <motion.div
        className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border-b border-white/10 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border-2 border-emerald-500/30">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <span className="font-semibold text-emerald-400">Verified by Proof of Build</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <motion.div
              className="bg-zinc-900/50 p-4 rounded-lg border border-white/10 transition-colors hover:border-emerald-500/50"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-zinc-400 text-sm font-medium">Verified Builds</div>
              <div className="text-3xl font-bold text-zinc-100 mt-2">{builds.length}</div>
            </motion.div>
            <motion.div
              className="bg-zinc-900/50 p-4 rounded-lg border border-white/10 transition-colors hover:border-emerald-500/50"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-zinc-400 text-sm font-medium">Skills Proven</div>
              <div className="text-3xl font-bold text-zinc-100 mt-2">{competencies.length}</div>
            </motion.div>
            <motion.div
              className="bg-zinc-900/50 p-4 rounded-lg border border-white/10 transition-colors hover:border-emerald-500/50"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-zinc-400 text-sm font-medium">Trust Score</div>
              <div className="text-3xl font-bold text-zinc-100 mt-2">
                {String(profile.trustScore)}%
              </div>
            </motion.div>
            <motion.div
              className="bg-zinc-900/50 p-4 rounded-lg border border-white/10 transition-colors hover:border-emerald-500/50"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-zinc-400 text-sm font-medium">Level</div>
              <div className="text-3xl font-bold text-zinc-100 mt-2">{profile.currentLevel}</div>
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
            <h2 className="text-xl font-bold text-zinc-100 mb-6 font-sans">Verified Competencies</h2>
            
            {/* Data Visualization */}
            {chartData.length > 2 ? (
              <div className="h-72 w-full mb-10 bg-zinc-900/40 p-4 rounded-xl border border-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.05)] print:break-inside-avoid">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                    <PolarGrid stroke="#52525b" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#e4e4e7', fontSize: 13, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
                      itemStyle={{ color: '#34d399', fontWeight: 600 }}
                    />
                    <Radar
                      name="Density Score"
                      dataKey="score"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="#34d399"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-64 w-full mb-10 bg-zinc-900/40 p-4 rounded-xl border border-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.05)] print:break-inside-avoid">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#a1a1aa" fontSize={12} />
                    <YAxis dataKey="subject" type="category" stroke="#e4e4e7" fontSize={13} fontWeight={500} width={80} />
                    <Tooltip 
                      cursor={{ fill: '#27272a' }}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
                      itemStyle={{ color: '#34d399', fontWeight: 600 }}
                    />
                    <Bar dataKey="score" fill="#34d399" radius={[0, 4, 4, 0]} barSize={32} name="Density Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="space-y-4">
              {competencies.length > 0 ? (
                competencies.map((comp: any, idx: number) => (
                  <motion.div
                    key={`${comp.skillName}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="print:break-inside-avoid"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-100">
                        {comp.skillName}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {Math.round(comp.density_score)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full print:bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(comp.density_score, 100)}%`,
                        }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 + idx * 0.05 }}
                      />
                    </div>
                    {comp.count && comp.count > 1 && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Proven in {comp.count} project{comp.count > 1 ? "s" : ""}
                      </p>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-zinc-400 text-sm">No verified competencies yet</p>
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
            <h2 className="text-xl font-bold text-zinc-100 mb-6 font-sans">Verified Projects</h2>
            <div className="space-y-4">
              {builds.length > 0 ? (
                builds.map((build: any, idx: number) => (
                  <motion.div
                    key={build.id}
                    className="border border-white/10 bg-zinc-900/20 rounded-lg p-6 hover:shadow-lg transition-all hover:border-emerald-500/30"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                          <Github size={20} className="text-zinc-400" />
                          {build.repoName}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">{build.repoOwner}</p>
                      </div>
                      <Badge
                        variant={
                          build.status === "verified"
                            ? "default"
                            : build.status === "processing"
                              ? "secondary"
                              : "destructive"
                        }
                        className="rounded-full px-3 py-1"
                      >
                        {build.status}
                      </Badge>
                    </div>

                    {build.description && (
                      <p className="text-zinc-300 text-sm mb-4">{build.description}</p>
                    )}

                    {/* Quality Metrics */}
                    {build.complexityScore && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-zinc-400 font-medium">Complexity</div>
                          <div className="text-lg font-bold text-zinc-100">
                            {Math.round(parseFloat(String(build.complexityScore)))}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-400 font-medium">Architecture</div>
                          <div className="text-lg font-bold text-zinc-100">
                            {Math.round(parseFloat(String(build.architectureQuality || "0")))}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-400 font-medium">Code Quality</div>
                          <div className="text-lg font-bold text-zinc-100">
                            {Math.round(parseFloat(String(build.codeQuality || "0")))}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {build.skillTags && Array.isArray(build.skillTags) && (
                      <div className="flex flex-wrap gap-2">
                        {build.skillTags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="rounded-full text-xs bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:bg-white/20 transition-all font-medium px-3 py-1">
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
                      className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium text-sm mt-4"
                    >
                      View Repository
                      <ExternalLink size={16} />
                    </a>
                  </motion.div>
                ))
              ) : (
                <p className="text-zinc-400">No verified projects yet</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
