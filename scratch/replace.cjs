const fs = require('fs');

let content = fs.readFileSync('client/src/pages/PublicProfile.tsx', 'utf-8');

// 1. Add Skeleton import
content = content.replace(
  'import { CheckCircle2, Github, Share2, ExternalLink } from "lucide-react";',
  'import { CheckCircle2, Github, Share2, ExternalLink } from "lucide-react";\nimport { Skeleton } from "@/components/ui/skeleton";'
);

// 2. Loading state
content = content.replace(
  /if \(profileQuery\.isLoading\) \{[\s\S]*?return \([\s\S]*?\}\);?\s*\}/,
  `if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col p-8">
        <div className="max-w-5xl mx-auto w-full space-y-8">
          <Skeleton className="h-32 w-full bg-zinc-900 rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24 bg-zinc-900 rounded-lg" />
            <Skeleton className="h-24 bg-zinc-900 rounded-lg" />
            <Skeleton className="h-24 bg-zinc-900 rounded-lg" />
            <Skeleton className="h-24 bg-zinc-900 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-8">
            <Skeleton className="h-96 col-span-1 bg-zinc-900 rounded-xl" />
            <Skeleton className="h-96 col-span-2 bg-zinc-900 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }`
);

// 3. Not Found state
content = content.replace(
  /if \(!profile\) \{[\s\S]*?return \([\s\S]*?\}\);?\s*\}/,
  `if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8 border border-white/10 bg-zinc-900/50 rounded-xl backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Profile Not Found</h1>
          <p className="text-zinc-400">The developer profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }`
);

// 4. Main colors and typography
// Replace bg-white -> bg-zinc-950
content = content.replace(/bg-white/g, 'bg-zinc-900/50');
content = content.replace(/className="min-h-screen bg-zinc-900\/50 font-roboto"/, 'className="min-h-screen bg-zinc-950 text-zinc-100 font-sans"');
content = content.replace(/bg-gray-50/g, 'bg-transparent');
content = content.replace(/border-gray-200/g, 'border-white/10');
content = content.replace(/text-gray-900/g, 'text-zinc-100');
content = content.replace(/text-gray-600/g, 'text-zinc-400');
content = content.replace(/text-gray-700/g, 'text-zinc-300');
content = content.replace(/text-gray-500/g, 'text-zinc-500');

// 5. Badges & Hero
content = content.replace(/bg-gradient-to-r from-blue-50 to-indigo-50/g, 'bg-gradient-to-b from-zinc-900/80 to-zinc-950');
content = content.replace(/border-blue-600/g, 'border-emerald-500/30');
content = content.replace(/text-blue-600/g, 'text-emerald-400');
content = content.replace(/bg-gray-200/g, 'bg-zinc-800');
content = content.replace(/from-blue-600 to-indigo-600/g, 'from-emerald-400 to-cyan-400');
content = content.replace(/hover:text-blue-700/g, 'hover:text-emerald-300');

fs.writeFileSync('client/src/pages/PublicProfile.tsx', content, 'utf-8');
console.log('PublicProfile updated');
