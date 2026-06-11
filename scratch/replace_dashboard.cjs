const fs = require('fs');

let content = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf-8');

// 1. Background and header
content = content.replace(
  '    <div className="min-h-screen bg-[#0A0A0A] text-white font-mono">',
  '    <div className="min-h-screen bg-[url(\'/pixel-bg.png\')] bg-cover bg-center bg-fixed text-white">'
);
content = content.replace(
  '      <div className="border-b border-[#00FF00] glass-panel px-6 py-4">',
  '      <div className="border-b-4 border-black bg-[#FFD100] px-6 py-4 shadow-[0_4px_0_#000]">'
);
// Make header title black instead of green
content = content.replace(
  '<h1 className="text-2xl font-bold font-pixel text-[#00FF00] flex items-center gap-2">',
  '<h1 className="text-2xl font-bold font-pixel text-black flex items-center gap-2">'
);
content = content.replace(
  '<span className="text-[#8B5CF6]">▶</span> PROOF OF BUILD TERMINAL',
  '<span className="text-black">▶</span> CODING ADVENTURE'
);
// Make header user info black
content = content.replace(
  '<p className="text-[#666] text-sm mt-1">',
  '<p className="text-black/70 text-sm mt-1 font-bold">'
);

// 2. Extract Stats Summary and make it horizontal
const statsSummaryOld = `            {/* Stats Summary */}
            <div className="border border-[#00FF00] glass-panel p-4 rounded">
              <h3 className="text-[#00FF00] font-bold font-pixel mb-4 flex items-center gap-2">
                <Trophy size={18} /> STATS
              </h3>
              <div className="space-y-3">
                <div className="border-l-2 border-[#8B5CF6] pl-3">
                  <div className="text-[#666] text-xs">Total Repositories</div>
                  <div className="text-[#00FF00] text-xl font-bold">{builds.length}</div>
                </div>
                <div className="border-l-2 border-[#8B5CF6] pl-3">
                  <div className="text-[#666] text-xs">Verified Builds</div>
                  <div className="text-[#00FF00] text-xl font-bold">
                    {builds.filter((b) => b.status === "verified").length}
                  </div>
                </div>
                <div className="border-l-2 border-[#8B5CF6] pl-3">
                  <div className="text-[#666] text-xs">Skills Unlocked</div>
                  <div className="text-[#00FF00] text-xl font-bold">{competencies.length}</div>
                </div>
                <div className="border-l-2 border-[#8B5CF6] pl-3">
                  <div className="text-[#666] text-xs">Badges Earned</div>
                  <div className="text-[#00FF00] text-xl font-bold">{badges.length}</div>
                </div>
              </div>
            </div>`;

content = content.replace(statsSummaryOld, '');

const statsSummaryNew = `        {/* Horizontal Stats Summary */}
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

        {/* Main grid layout */}`;

content = content.replace('{/* Main grid layout */}', statsSummaryNew);

// 3. Replace all glass-panel with dialogue-box-dark and fix borders
content = content.replace(/border border-\[#00FF00\] glass-panel p-4 rounded/g, 'dialogue-box-dark');
content = content.replace(/border border-\[#00FF00\] glass-panel p-6 rounded/g, 'dialogue-box-dark');
content = content.replace(/border border-red-500\/50 glass-panel p-4 rounded/g, 'dialogue-box-dark border-red-500/50');
content = content.replace(/border border-\[#8B5CF6\] bg-\[#8B5CF6\]\/10 p-6 rounded-lg/g, 'dialogue-box-dark');

// 4. Update Header Colors inside panels
content = content.replace(/text-\[#00FF00\] font-bold font-pixel/g, 'text-[#FFD100] font-bold font-pixel text-pixel-shadow');
content = content.replace(/text-red-400 font-bold font-pixel/g, 'text-[#FF5555] font-bold font-pixel text-pixel-shadow');

// 5. Update Buttons
content = content.replace(/className="bg-\[#00FF00\] text-\[#0A0A0A\] hover:bg-\[#00DD00\] font-bold font-pixel cursor-pointer neon-glow"/g, 'className="btn-rpg cursor-pointer"');
content = content.replace(/className="w-full bg-\[#00FF00\] text-\[#0A0A0A\] hover:bg-\[#00DD00\] font-bold disabled:bg-\[#333\] disabled:text-\[#888\]"/g, 'className="w-full btn-rpg disabled:opacity-50"');
content = content.replace(/className="bg-\[#8B5CF6\] text-white hover:bg-\[#7c4fe3\] font-bold w-full sm:w-auto"/g, 'className="btn-rpg-blue w-full sm:w-auto cursor-pointer"');

// 6. Fix sign out / user button text
content = content.replace(
  '<div className="text-[#00FF00] text-sm">',
  '<div className="text-black font-bold font-pixel text-sm mr-2">'
);
content = content.replace(
  'className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 text-xs px-2 py-1 h-auto"',
  'className="btn-rpg bg-red-500 text-white border-red-900 text-xs px-2 py-1 h-auto"'
);

fs.writeFileSync('client/src/pages/Dashboard.tsx', content, 'utf-8');
console.log('Dashboard RPG styling applied.');
