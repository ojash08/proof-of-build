import { useAuth } from "@/_core/hooks/useAuth";
import { SignInButton } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ShieldCheck,
  Zap,
  Globe,
  Trophy,
  ArrowRight,
  GitBranch,
  Cpu,
  Share2,
  ChevronDown,
  Terminal,
  Sparkles,
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

/* ──────────────────────────────────────────────
   Animation Variants
   ────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 20px rgba(0,255,0,0.15)",
      "0 0 40px rgba(0,255,0,0.25)",
      "0 0 20px rgba(0,255,0,0.15)",
    ],
    transition: { duration: 3, repeat: Infinity },
  },
};

/* ──────────────────────────────────────────────
   Feature Data
   ────────────────────────────────────────────── */
const features = [
  {
    icon: ShieldCheck,
    title: "TEE-Verified Analysis",
    description:
      "Every repository is analysed inside a Trusted Execution Environment — tamper-proof and cryptographically attested.",
    color: "#00FF00",
  },
  {
    icon: Zap,
    title: "AI Competency Mapping",
    description:
      "Gemini-powered code intelligence maps your skills across languages, frameworks, and architectural patterns.",
    color: "#8B5CF6",
  },
  {
    icon: Globe,
    title: "Public Trust Ledger",
    description:
      "Share an immutable, recruiter-ready profile that proves exactly what you've built — no self-reporting required.",
    color: "#00FF00",
  },
  {
    icon: Trophy,
    title: "Gamified Progress",
    description:
      "Earn XP, unlock badges, and climb levels as you verify more repositories. Your growth, visualised.",
    color: "#8B5CF6",
  },
];

const steps = [
  {
    icon: GitBranch,
    step: "01",
    title: "Submit Repo",
    description: "Paste any public GitHub repository URL into the terminal.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Analysis",
    description:
      "Our TEE-hosted AI dissects code quality, architecture, and skill signals.",
  },
  {
    icon: Share2,
    step: "03",
    title: "Share Profile",
    description:
      "Get a verified public profile you can share with recruiters and teams.",
  },
];

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function Home() {
  const { isAuthenticated, loading, devLogin } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden font-sans selection:bg-[#00FF00]/20 selection:text-[#00FF00]">
      {/* ── Subtle grid background ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Radial glow top-center ── */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[#00FF00]/[0.04] blur-[120px] z-0" />

      {/* ══════════════════════════════════════════
          NAV BAR
         ══════════════════════════════════════════ */}
      <motion.nav
        className="relative z-30 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 backdrop-blur-md bg-[#0A0A0A]/70"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2.5">
          <Terminal size={22} className="text-[#00FF00]" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-[#00FF00]">Proof</span>
            <span className="text-white/70"> of </span>
            <span className="text-white">Build</span>
          </span>
        </div>

        <div className="hidden md:flex flex-1 justify-center px-8">
          <SearchBar />
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-24 rounded-lg bg-white/5 animate-pulse" />
          ) : isAuthenticated ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[#00FF00] text-[#0A0A0A] hover:bg-[#00DD00] transition-colors cursor-pointer"
            >
              Dashboard
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* Only show Dev tools in development mode */}
              {import.meta.env.DEV && (
                <>
                  <button 
                    onClick={() => {
                      const username = prompt("Enter the developer's username you wish to review (e.g., ojash_08):");
                      if (username && username.trim() !== "") {
                        window.location.href = `/profile/${username.trim()}`;
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded border border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00]/10 transition-colors cursor-pointer"
                  >
                    As Recruiter
                  </button>
                  <button 
                    onClick={() => {
                      const username = prompt("Enter your exact developer username (e.g., ojash_08):");
                      if (username && username.trim() !== "" && typeof devLogin === "function") {
                        devLogin(username.trim());
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded bg-[#00FF00]/20 text-[#00FF00] hover:bg-[#00FF00]/30 transition-colors cursor-pointer"
                  >
                    As Dev
                  </button>
                </>
              )}
              <SignInButton forceRedirectUrl="/dashboard" fallbackRedirectUrl="/dashboard">
                <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[#00FF00] text-[#0A0A0A] hover:bg-[#00DD00] transition-colors cursor-pointer">
                  Sign In
                  <ArrowRight size={16} />
                </button>
              </SignInButton>
            </div>
          )}
        </div>
      </motion.nav>

      {/* ══════════════════════════════════════════
          HERO SECTION
         ══════════════════════════════════════════ */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-20 md:pt-36 md:pb-28">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00FF00]/30 bg-[#00FF00]/[0.06] text-[#00FF00] text-xs font-medium tracking-wide uppercase"
        >
          <Sparkles size={14} />
          TEE-Verified Developer Credentials
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight max-w-5xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <span className="text-white">Proof of&nbsp;</span>
          <span
            className="relative inline-block text-[#00FF00]"
            style={{
              textShadow:
                "0 0 30px rgba(0,255,0,0.35), 0 0 60px rgba(0,255,0,0.15)",
            }}
          >
            Build
            {/* underline glow */}
            <motion.span
              className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00FF00] to-transparent rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            />
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-5 text-lg md:text-xl text-[#8B5CF6] font-medium tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          The Verification Ledger for Developers
        </motion.p>

        {/* Description */}
        <motion.p
          className="mt-6 max-w-2xl text-white/50 text-base md:text-lg leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          Submit your GitHub repositories, and our AI — running inside a{" "}
          <span className="text-white/70 font-medium">
            Trusted Execution Environment
          </span>{" "}
          — verifies your skills, maps competencies, and generates a
          tamper-proof developer profile that recruiters can trust.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          {isAuthenticated ? (
            <motion.button
              onClick={() => navigate("/dashboard")}
              className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-bold bg-[#00FF00] text-[#0A0A0A] hover:bg-[#00DD00] transition-all cursor-pointer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              {...glowPulse}
            >
              Go to Dashboard
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </motion.button>
          ) : (
            <SignInButton forceRedirectUrl="/dashboard" fallbackRedirectUrl="/dashboard">
              <motion.button
                className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-bold bg-[#00FF00] text-[#0A0A0A] hover:bg-[#00DD00] transition-all"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                {...glowPulse}
              >
                Get Started
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </motion.button>
            </SignInButton>
          )}

        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-20 text-white/20"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES SECTION
         ══════════════════════════════════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-[#00FF00] text-sm font-semibold tracking-widest uppercase mb-3">
              Core Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Built for{" "}
              <span className="text-[#8B5CF6]">Trust</span> &{" "}
              <span className="text-[#00FF00]">Transparency</span>
            </h2>
          </motion.div>

          {/* Feature cards grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  variants={scaleIn}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className="group relative rounded-2xl p-6 border border-white/[0.07] bg-white/[0.03] backdrop-blur-lg hover:border-white/[0.14] transition-colors overflow-hidden"
                >
                  {/* Card glow on hover */}
                  <div
                    className="pointer-events-none absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[60px]"
                    style={{ backgroundColor: feat.color + "22" }}
                  />

                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                    style={{
                      backgroundColor: feat.color + "12",
                      border: `1px solid ${feat.color}30`,
                    }}
                  >
                    <Icon size={22} style={{ color: feat.color }} />
                  </div>

                  <h3 className="text-white font-semibold text-lg mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    {feat.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS SECTION
         ══════════════════════════════════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-20 md:py-28 border-t border-white/5">
        {/* Radial glow */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#8B5CF6]/[0.04] blur-[100px]" />

        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-[#8B5CF6] text-sm font-semibold tracking-widest uppercase mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Three Steps to{" "}
              <span className="text-[#00FF00]">Verified</span> Trust
            </h2>
          </motion.div>

          {/* Steps */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.step}
                  variants={scaleIn}
                  className="relative group"
                >
                  {/* Connector line (visible md+) */}
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-[#00FF00]/30 to-[#8B5CF6]/30" />
                  )}

                  <div className="flex flex-col items-center text-center rounded-2xl p-8 border border-white/[0.07] bg-white/[0.03] backdrop-blur-lg hover:border-white/[0.14] transition-all">
                    {/* Step number ring */}
                    <div className="relative mb-6">
                      <div className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-[#00FF00]/30 bg-[#00FF00]/[0.05]">
                        <Icon size={28} className="text-[#00FF00]" />
                      </div>
                      <span className="absolute -top-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full bg-[#8B5CF6] text-white text-xs font-bold">
                        {s.step}
                      </span>
                    </div>

                    <h3 className="text-white text-xl font-bold mb-2">
                      {s.title}
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER
         ══════════════════════════════════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-20 md:py-24">
        <motion.div
          className="max-w-4xl mx-auto rounded-3xl border border-[#00FF00]/20 bg-gradient-to-br from-[#00FF00]/[0.06] to-[#8B5CF6]/[0.06] backdrop-blur-xl p-10 md:p-16 text-center overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
        >
          {/* Background glow */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-[#00FF00]/[0.05] blur-[80px]" />

          <h2 className="relative text-3xl md:text-4xl font-bold mb-4">
            Ready to prove what you've{" "}
            <span className="text-[#00FF00]">built</span>?
          </h2>
          <p className="relative text-white/50 max-w-lg mx-auto mb-8">
            Join developers who are replacing résumés with verified,
            tamper-proof build records.
          </p>

          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <motion.button
                onClick={() => navigate("/dashboard")}
                className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-bold bg-[#00FF00] text-[#0A0A0A] hover:bg-[#00DD00] transition-colors cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
              >
                Open Dashboard
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </motion.button>
            ) : (
            <SignInButton forceRedirectUrl="/dashboard" fallbackRedirectUrl="/dashboard">
              <motion.button
                className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-bold bg-[#00FF00] text-[#0A0A0A] hover:bg-[#00DD00] transition-colors"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started Free
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </motion.button>
            </SignInButton>
            )}

          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-[#00FF00]/50" />
            <span>
              Built with{" "}
              <span className="text-[#00FF00]/60 font-medium">
                Proof of Build
              </span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span>© {new Date().getFullYear()} Proof of Build</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
