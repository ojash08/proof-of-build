import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, Zap, Trophy, Code2, TrendingUp, Swords, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@clerk/clerk-react";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Sci-fi terminal aesthetic dashboard for verified developers
 * Features: XP progress, skill tree, activity feed, daily quests
 */
export default function Dashboard() {
  const { user, isAuthenticated, devLogin, logout, devToken, loading } = useAuth();
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [isSettingBanner, setIsSettingBanner] = useState(false);
  const [canReverify, setCanReverify] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  
  const { theme, toggleTheme } = useTheme();

  // tRPC queries
  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const buildsQuery = trpc.builds.getUserBuilds.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      // Auto-poll every 3 seconds if any build is pending or processing
      const builds = query.state.data;
      if (builds && builds.some((b: any) => b.status === "pending" || b.status === "processing")) {
        return 3000;
      }
      return false;
    },
  });
  const competenciesQuery = trpc.user.getCompetencies.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const badgesQuery = trpc.user.getBadges.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const activityQuery = trpc.user.getActivityFeed.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  // tRPC mutations
  const submitRepoMutation = trpc.builds.submitRepository.useMutation();
  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  const handleSubmitRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRepoMutation.mutateAsync({ repoUrl });
      toast.success("Repository submitted for verification!");
      setRepoUrl("");
      buildsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit repository");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    
    setIsSettingUsername(true);
    try {
      await updateProfileMutation.mutateAsync({ username: usernameInput.trim() });
      toast.success("Username set successfully!");
      profileQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to set username");
    } finally {
      setIsSettingUsername(false);
    }
  };

  const handleSetBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerUrlInput.trim()) return;
    
    setIsSettingBanner(true);
    try {
      await updateProfileMutation.mutateAsync({ bannerUrl: bannerUrlInput.trim() });
      toast.success("Banner updated successfully!");
      profileQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update banner");
    } finally {
      setIsSettingBanner(false);
    }
  };

  const builds = buildsQuery.data || [];

  const parsedUrl = useMemo(() => {
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        return { owner: match[1].toLowerCase(), repo: match[2].replace(/\.git$/, "").toLowerCase() };
      }
    } catch (e) {}
    return null;
  }, [repoUrl]);

  const existingBuild = useMemo(() => {
    if (!parsedUrl || !builds) return null;
    return builds.find(b => 
      b.repoOwner?.toLowerCase() === parsedUrl.owner && 
      b.repoName?.toLowerCase() === parsedUrl.repo
    );
  }, [parsedUrl, builds]);

  useEffect(() => {
    let active = true;
    if (existingBuild) {
      if (existingBuild.status === "pending" || existingBuild.status === "processing") {
        setCanReverify(false);
        setIsCheckingUpdate(false);
        return;
      }

      setCanReverify(false);
      setIsCheckingUpdate(true);
      fetch(`https://api.github.com/repos/${parsedUrl?.owner}/${parsedUrl?.repo}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          if (data && data.pushed_at) {
            const pushedAt = new Date(data.pushed_at);
            const verifiedAt = new Date(existingBuild.verifiedAt || existingBuild.updatedAt || existingBuild.createdAt);
            if (pushedAt > verifiedAt) {
              setCanReverify(true);
            }
          }
        })
        .catch(console.error)
        .finally(() => {
          if (active) setIsCheckingUpdate(false);
        });
    } else {
      setCanReverify(false);
      setIsCheckingUpdate(false);
    }
    return () => { active = false; };
  }, [existingBuild, parsedUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col p-6 gap-6" style={{ backgroundImage: "radial-gradient(circle at center, #111 0%, #000 100%)" }}>
        <div className="glass-panel border-b border-[#00FF00] px-6 py-4 flex justify-between items-center rounded">
          <Skeleton className="h-8 w-64 bg-[#00FF00]/20" />
          <Skeleton className="h-10 w-96 bg-[#00FF00]/20" />
          <Skeleton className="h-8 w-32 bg-[#00FF00]/20" />
        </div>
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="col-span-1 md:col-span-3 space-y-4">
            <Skeleton className="h-96 w-full rounded glass-panel bg-[#00FF00]/10" />
            <Skeleton className="h-48 w-full rounded glass-panel bg-[#00FF00]/10" />
          </div>
          <div className="col-span-1 md:col-span-6 space-y-6">
            <Skeleton className="h-48 w-full rounded glass-panel bg-[#00FF00]/10" />
            <Skeleton className="h-96 w-full rounded glass-panel bg-[#00FF00]/10" />
          </div>
          <div className="col-span-1 md:col-span-3 space-y-4">
            <Skeleton className="h-64 w-full rounded glass-panel bg-[#00FF00]/10" />
            <Skeleton className="h-64 w-full rounded glass-panel bg-[#00FF00]/10" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#00FF00] flex items-center justify-center font-mono p-4">
        <div className="text-center border border-[#00FF00] bg-[#0F0F0F] p-8 rounded-lg max-w-md w-full">
          <p className="text-2xl mb-4 text-[#00FF00] font-bold">▶ ACCESS DENIED</p>
          <p className="text-[#888] mb-6">Please return to the home page to authenticate.</p>
          <Button
            onClick={() => window.location.href = "/"}
            className="bg-[#00FF00] text-[#0A0A0A] hover:bg-[#00DD00] font-bold cursor-pointer"
          >
            RETURN TO HOME
          </Button>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const competencies = competenciesQuery.data || [];
  const badges = badgesQuery.data || [];
  const activity = activityQuery.data || [];

  return (
    <div className={`min-h-screen bg-[url('/pixel-bg.png')] bg-cover bg-center bg-fixed ${theme === 'dark' ? 'bg-black/80 bg-blend-multiply text-white' : 'text-black'} transition-all duration-300`}>
      {profile?.bannerUrl && (
        <div 
          className="h-48 w-full bg-cover bg-center border-b-4 border-black shadow-[0_4px_0_#000]" 
          style={{ backgroundImage: `url(${profile.bannerUrl})` }}
        />
      )}
      {/* Terminal header */}
      <div className={`border-b-4 border-black ${theme === 'dark' ? 'bg-[#111] shadow-[0_4px_0_#333]' : 'bg-[#FFD100] shadow-[0_4px_0_#000]'} px-6 py-4 transition-colors duration-300`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold font-pixel flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              <span className={theme === 'dark' ? 'text-[#00FF00]' : 'text-black'}>▶</span> CODING ADVENTURE
            </h1>
            <p className={`${theme === 'dark' ? 'text-white/70' : 'text-black/70'} text-sm mt-1 font-bold`}>
              {profile?.username || "Developer"} • Level {profile?.currentLevel || 1} • XP:{" "}
              {profile?.totalXp || 0}
            </p>
          </div>
          <div className="flex-1 flex justify-center px-6">
            <SearchBar />
          </div>
          <div className="text-right flex flex-row items-center gap-4">
            <div className={`font-bold font-pixel text-sm ${theme === 'dark' ? 'text-[#00FF00]' : 'text-black'}`}>
              TRUST SCORE: {profile?.trustScore || "0.00"}%
            </div>
            {toggleTheme && (
              <button 
                onClick={toggleTheme} 
                className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-[#00FF00]' : 'hover:bg-black/10 text-black'}`}
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            {devToken ? (
              <Button 
                onClick={logout} 
                className="btn-rpg bg-red-500 text-white border-red-900 text-xs px-2 py-1 h-auto"
              >
                SIGN OUT
              </Button>
            ) : (
              <UserButton appearance={{ elements: { userButtonPopoverCard: theme === 'dark' ? "bg-[#0F0F0F] border border-[#00FF00] text-white" : "" } }} />
            )}
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <motion.div
        className="h-1 bg-gradient-to-r from-[#00FF00] via-[#8B5CF6] to-[#00FF00] neon-glow"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ originX: 0 }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Username Setup Prompt */}
        {profile && !profile.username && (
          <motion.div 
            className="mb-6 dialogue-box-dark"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-[#8B5CF6] font-bold mb-2 flex items-center gap-2">
              <Zap size={20} /> COMPLETE YOUR PROFILE
            </h2>
            <p className="text-white/70 text-sm mb-4">
              Set a developer username to claim your public profile URL and share your verified builds.
            </p>
            <form onSubmit={handleSetUsername} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Enter a unique username..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="bg-[#1A1A1A] border-[#8B5CF6] text-white max-w-sm"
                disabled={isSettingUsername}
              />
              <Button
                type="submit"
                disabled={isSettingUsername || !usernameInput.trim()}
                className="btn-rpg-blue w-full sm:w-auto cursor-pointer"
              >
                {isSettingUsername ? "SAVING..." : "CLAIM USERNAME"}
              </Button>
            </form>
          </motion.div>
        )}

                {/* Horizontal Stats Summary */}
        <motion.div
          className="dialogue-box-dark mb-6 flex flex-row items-center justify-around text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <div className="text-[#FFD100] text-xs font-pixel mb-1 text-pixel-shadow">Total Repositories</div>
            <div className="text-white text-3xl font-bold font-pixel text-pixel-shadow">{builds.length}</div>
          </div>
          <div>
            <div className="text-[#FFD100] text-xs font-pixel mb-1 text-pixel-shadow">Verified Builds</div>
            <div className="text-white text-3xl font-bold font-pixel text-pixel-shadow">
              {builds.filter((b) => b.status === "verified").length}
            </div>
          </div>
          <div>
            <div className="text-[#FFD100] text-xs font-pixel mb-1 text-pixel-shadow">Skills Unlocked</div>
            <div className="text-white text-3xl font-bold font-pixel text-pixel-shadow">{competencies.length}</div>
          </div>
          <div>
            <div className="text-[#FFD100] text-xs font-pixel mb-1 text-pixel-shadow">Badges Earned</div>
            <div className="text-white text-3xl font-bold font-pixel text-pixel-shadow">{badges.length}</div>
          </div>
        </motion.div>

        {/* Main grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Activity Feed - Left Column (span-3) */}
          <motion.div
            className="col-span-1 md:col-span-3 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="dialogue-box-dark">
              <h2 className="text-[#FFD100] font-bold font-pixel text-pixel-shadow mb-4 flex items-center gap-2">
                <TrendingUp size={18} /> QUEST LOG
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activity.length > 0 ? (
                  activity.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      className="text-xs border-l-2 border-[#8B5CF6] pl-3 py-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="text-[#00FF00]">{entry.title}</div>
                      <div className="text-[#666] text-xs">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-[#666] text-xs">No activity yet</div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="dialogue-box-dark">
              <h3 className="text-[#FFD100] font-bold font-pixel text-pixel-shadow mb-3 text-sm">INVENTORY</h3>
              <div className="grid grid-cols-3 gap-2">
                {badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    className="bg-[#1A1A1A] border border-[#8B5CF6] p-2 rounded text-center text-xs"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Trophy size={16} className="mx-auto mb-1 text-[#8B5CF6]" />
                    <div className="text-[#00FF00] text-xs truncate">{badge.title}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Skill Tree - Center Column (span-6) */}
          <motion.div
            className="col-span-1 md:col-span-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Repository Submission Form */}
            <div className="dialogue-box-dark">
              <h2 className="text-[#FFD100] font-bold font-pixel text-pixel-shadow mb-4 flex items-center gap-2">
                <Github size={20} /> SUBMIT REPOSITORY
              </h2>
              <form onSubmit={handleSubmitRepo} className="space-y-4">
                <div>
                  <label className="text-[#00FF00] text-sm mb-2 block">
                    GitHub Repository URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="bg-[#1A1A1A] border-[#00FF00] text-white placeholder-[#666] font-mono"
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || (!!existingBuild && existingBuild.status !== "failed" && !canReverify) || isCheckingUpdate}
                  className="w-full btn-rpg disabled:opacity-50"
                >
                  {isSubmitting 
                    ? "SUBMITTING..." 
                    : isCheckingUpdate 
                      ? "CHECKING REPOSITORY STATUS..."
                      : existingBuild && existingBuild.status === "failed"
                        ? "RETRY FAILED VERIFICATION"
                        : existingBuild && !canReverify 
                          ? (existingBuild.status === "pending" || existingBuild.status === "processing" ? "VERIFICATION IN PROGRESS..." : "ALREADY VERIFIED")
                          : existingBuild && canReverify
                            ? "RE-VERIFY UPDATED REPOSITORY"
                            : "SUBMIT FOR VERIFICATION"}
                </Button>
              </form>
            </div>

            {/* Verified Builds */}
            <div className="dialogue-box-dark">
              <h2 className="text-[#FFD100] font-bold font-pixel text-pixel-shadow mb-4 flex items-center gap-2">
                <Code2 size={20} /> VERIFIED BUILDS ({builds.length})
              </h2>
              <div className="space-y-3">
                {builds.length > 0 ? (
                  builds.map((build, idx) => (
                    <motion.div
                      key={build.id}
                      className="border border-[#8B5CF6] bg-[#1A1A1A] p-4 rounded"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[#00FF00] font-bold">{build.repoName}</div>
                          <div className="text-[#666] text-xs">{build.repoUrl}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {build.status === "failed" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs h-6 px-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                              onClick={() => {
                                setRepoUrl(build.repoUrl || "");
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              RETRY
                            </Button>
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded font-bold ${
                              build.status === "verified"
                                ? "bg-[#00FF00] text-[#0A0A0A]"
                                : build.status === "processing"
                                  ? "bg-[#8B5CF6] text-white"
                                  : build.status === "failed"
                                    ? "bg-red-600 text-white"
                                    : "bg-[#666] text-white"
                            }`}
                          >
                            {build.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {build.complexityScore && (
                        <div className="text-xs text-[#00FF00] mt-2">
                          Complexity: {build.complexityScore}% | Architecture: {build.architectureQuality}% | Code Quality: {build.codeQuality}%
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-[#666] text-sm">
                    No verified builds yet. Submit a repository to get started!
                  </div>
                )}
              </div>
            </div>

            {/* Competencies Radar */}
            <div className="dialogue-box-dark">
              <h2 className="text-[#FFD100] font-bold font-pixel text-pixel-shadow mb-4 flex items-center gap-2">
                <Zap size={20} /> CHARACTER STATS
              </h2>
              <div className="space-y-2">
                {competencies.length > 0 ? (
                  competencies.slice(0, 8).map((comp, idx) => (
                    <motion.div
                      key={comp.id}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="text-[#00FF00] text-xs font-bold w-24 truncate">
                        {comp.skillName}
                      </div>
                      <div className="flex-1 bg-[#1A1A1A] h-2 rounded border border-[#8B5CF6]">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#00FF00] to-[#8B5CF6] rounded"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(
                              parseFloat(comp.densityWeight.toString()),
                              100
                            )}%`,
                          }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                      <div className="text-[#00FF00] text-xs font-bold w-12 text-right">
                        {Math.round(parseFloat(comp.densityWeight.toString()))}%
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-[#666] text-sm">
                    No competencies detected yet. Verify repositories to build your skill profile.
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Daily Quests/Stats - Right Column (span-3) */}
          <motion.div
            className="col-span-1 md:col-span-3 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >


            {/* Daily Quests */}
            <div className="dialogue-box-dark">
              <h3 className="text-[#FFD100] font-bold font-pixel text-pixel-shadow mb-4 flex items-center gap-2">
                <Zap size={18} /> DAILY QUESTS
              </h3>
              <div className="space-y-2">
                <motion.div
                  className="bg-[#1A1A1A] border border-[#8B5CF6] p-3 rounded text-xs"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-[#00FF00] font-bold">First Build</div>
                  <div className="text-[#666] text-xs">Submit your first repository</div>
                  <div className="mt-2 text-[#8B5CF6] text-xs">
                    {builds.length > 0 ? "✓ COMPLETED" : "⏳ IN PROGRESS"}
                  </div>
                </motion.div>
                <motion.div
                  className="bg-[#1A1A1A] border border-[#8B5CF6] p-3 rounded text-xs"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-[#00FF00] font-bold">Skill Diversity</div>
                  <div className="text-[#666] text-xs">Unlock 5 different skills</div>
                  <div className="mt-2 text-[#8B5CF6] text-xs">
                    {competencies.length >= 5
                      ? "✓ COMPLETED"
                      : `⏳ ${competencies.length}/5`}
                  </div>
                </motion.div>
                <motion.div
                  className="bg-[#1A1A1A] border border-[#8B5CF6] p-3 rounded text-xs"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-[#00FF00] font-bold">Public Profile</div>
                  <div className="text-[#666] text-xs">Set your username</div>
                  <div className="mt-2 text-[#8B5CF6] text-xs">
                    {profile?.username ? "✓ COMPLETED" : "⏳ IN PROGRESS"}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Boss Battles */}
            <div className="dialogue-box-dark border-red-500/50">
              <h3 className="text-[#FF5555] font-bold font-pixel text-pixel-shadow mb-4 flex items-center gap-2">
                <Swords size={18} /> BOSS BATTLES
              </h3>
              <div className="space-y-2">
                <motion.div
                  className="bg-[#1A1A1A] border border-red-500/40 p-3 rounded text-xs"
                  whileHover={{ scale: 1.02, borderColor: "rgba(239,68,68,0.7)" }}
                >
                  <div className="text-red-400 font-bold">🏰 The Architect</div>
                  <div className="text-[#666] text-xs">Verify 10 repositories</div>
                  <div className="mt-2 w-full bg-[#1A1A1A] h-1.5 rounded border border-red-500/20">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((builds.filter(b => b.status === "verified").length / 10) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="mt-1 text-red-400/60 text-xs">
                    {builds.filter(b => b.status === "verified").length}/10 repos
                  </div>
                </motion.div>
                <motion.div
                  className="bg-[#1A1A1A] border border-red-500/40 p-3 rounded text-xs"
                  whileHover={{ scale: 1.02, borderColor: "rgba(239,68,68,0.7)" }}
                >
                  <div className="text-red-400 font-bold">⚔️ Full Stack Titan</div>
                  <div className="text-[#666] text-xs">Unlock skills in 8+ categories</div>
                  <div className="mt-2 w-full bg-[#1A1A1A] h-1.5 rounded border border-red-500/20">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((competencies.length / 8) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="mt-1 text-red-400/60 text-xs">
                    {competencies.length}/8 skills
                  </div>
                </motion.div>
                <motion.div
                  className="bg-[#1A1A1A] border border-red-500/40 p-3 rounded text-xs"
                  whileHover={{ scale: 1.02, borderColor: "rgba(239,68,68,0.7)" }}
                >
                  <div className="text-red-400 font-bold">🐉 Open Source Legend</div>
                  <div className="text-[#666] text-xs">Earn a Trust Score above 90%</div>
                  <div className="mt-2 text-red-400/60 text-xs">
                    {parseFloat(String(profile?.trustScore || "0")) >= 90
                      ? "💀 BOSS DEFEATED"
                      : `⏳ Trust: ${profile?.trustScore || "0"}%`}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Banner Settings */}
            <div className="dialogue-box-dark">
              <h3 className="text-[#FFD100] font-bold font-pixel text-pixel-shadow mb-4 flex items-center gap-2">
                <Zap size={18} /> PROFILE BANNER
              </h3>
              <form onSubmit={handleSetBanner} className="space-y-3">
                <Input
                  type="url"
                  placeholder="Image URL (e.g. imgur...)"
                  value={bannerUrlInput}
                  onChange={(e) => setBannerUrlInput(e.target.value)}
                  className="bg-[#1A1A1A] border-[#8B5CF6] text-white text-xs h-8"
                  disabled={isSettingBanner}
                />
                <Button
                  type="submit"
                  disabled={isSettingBanner || !bannerUrlInput.trim()}
                  className="btn-rpg-blue w-full cursor-pointer text-xs h-8"
                >
                  {isSettingBanner ? "SAVING..." : "UPDATE BANNER"}
                </Button>
              </form>
            </div>

            {/* Public Profile Link */}
            {profile?.username && (
              <div className="border border-[#00FF00] bg-[#0F0F0F] p-4 rounded">
                <h3 className="text-[#00FF00] font-bold mb-3 text-sm">PUBLIC PROFILE</h3>
                <a
                  href={`/p/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8B5CF6] hover:text-[#00FF00] text-xs break-all underline"
                >
                  /p/{profile.username}
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
