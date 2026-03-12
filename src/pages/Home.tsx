import { motion } from 'framer-motion';
import { Zap, Database, ShieldCheck, Activity, Terminal, ArrowRight, Code2, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const EXAMPLES = [
  { name: 'facebook/react', stars: '220k', desc: 'The most popular library for building user interfaces.', url: 'https://github.com/facebook/react' },
  { name: 'vercel/next.js', stars: '110k', desc: 'The easiest way to build fast web applications.', url: 'https://github.com/vercel/next.js' },
  { name: 'tailwindlabs/tailwindcss', stars: '75k', desc: 'A styling tool that developers love.', url: 'https://github.com/tailwindlabs/tailwindcss' },
];

export default function Home() {
  const navigate = useNavigate();

  const handleRepoClick = (url: string) => {
    navigate(`/builder?repo=${encodeURIComponent(url)}`);
  };

  return (
    <div className="relative isolate overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-zinc-100 to-[#76F1BC] opacity-10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      
      <div className="py-24 sm:py-32 lg:pb-56">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-center mb-10">
                <span className="relative rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 ring-1 ring-zinc-100 bg-white shadow-sm flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#76F1BC] animate-pulse" />
                  Now much faster
                </span>
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-zinc-900 sm:text-8xl mb-8 leading-[0.9]">
                Turn code into<br />
                <span className="text-[#76F1BC]">Datasets.</span>
              </h1>
              <p className="mt-8 text-xl leading-8 text-zinc-500 max-w-2xl mx-auto font-medium">
                The simplest way to prepare GitHub repositories for AI analysis. 
                Import, summarize, and query any codebase instantly.
              </p>
              <div className="mt-12 flex items-center justify-center gap-x-6">
                <Link
                  to="/builder"
                  className="rounded-xl bg-black px-10 py-5 text-sm font-black text-white shadow-2xl hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 group text-decoration-none uppercase tracking-widest"
                >
                  Start Importing <Zap className="w-4 h-4 text-[#76F1BC] fill-current" />
                </Link>
                <Link to="/about" className="text-sm font-black leading-6 text-zinc-900 hover:text-zinc-500 transition-colors uppercase tracking-widest text-decoration-none">
                  Learn How
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="mt-24 relative rounded-[2rem] overflow-hidden border border-zinc-100 shadow-2xl animate-in">
             <img src="/repodata_hero_abstract_1773292117661.png" alt="Repodata AI Visualization" className="w-full h-auto object-cover aspect-video" />
             <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent " />
          </div>

          <div className="mt-40 space-y-20">
             <div className="text-center max-w-2xl mx-auto space-y-4">
                <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Built for GitHub Users.</h2>
                <p className="text-zinc-500 font-medium">Everything you need to make code understandable for AI.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: 'One-File Export', desc: 'Combine entire folders into a single text file for AI prompts.', icon: Database },
                  { title: 'Smart Summaries', desc: 'Get a clear explanation of how the project is built.', icon: Activity },
                  { title: 'Private & Secure', desc: 'Your code stays yours. Isolated processing on every job.', icon: ShieldCheck },
                ].map((feature) => (
                  <div key={feature.title} className="notte-card p-10 space-y-6">
                     <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                        <feature.icon className="w-6 h-6 text-[#76F1BC]" />
                     </div>
                     <h3 className="text-lg font-black text-zinc-900 uppercase tracking-wide">{feature.title}</h3>
                     <p className="text-sm text-zinc-500 leading-relaxed font-medium">{feature.desc}</p>
                  </div>
                ))}
             </div>
          </div>

          <div className="mt-40 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 px-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Try with these Repos
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EXAMPLES.map((repo, idx) => (
                <motion.div
                  key={repo.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  onClick={() => handleRepoClick(repo.url)}
                  className="notte-card p-6 group cursor-pointer hover:border-zinc-900 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-zinc-50 rounded-lg group-hover:bg-[#76F1BC]/10 transition-colors">
                      <Code2 className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                    </div>
                  </div>
                  <h4 className="font-bold text-zinc-900 mb-2 truncate text-sm">{repo.name}</h4>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{repo.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
