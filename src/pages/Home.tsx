import { motion } from 'framer-motion';
import { Zap, Database, ShieldCheck, Activity, Terminal, ArrowRight, Code2, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

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
    <div className="relative isolate overflow-hidden bg-black min-h-screen">
      <SEO title="Repo Trace | Professional GitHub Repository Analysis" description="Unlock the secrets of any GitHub repository with Repo Trace. Get fast, reliable, and high-fidelity code analysis integrated with advanced AI models." />
      
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-zinc-800 to-[#76F1BC] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      
      <div className="py-16 sm:py-24 lg:pb-56">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            >
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <span className="rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[#76F1BC] bg-[#76F1BC]/5 border border-[#76F1BC]/10 flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#76F1BC] animate-pulse" />
                  System v4.8 Active
                </span>
                <span className="rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 bg-white/5 border border-white/10 flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  Public Access
                </span>
              </div>
              <h1 className="text-4xl xs:text-5xl sm:text-7xl font-black tracking-tighter text-white lg:text-[9rem] mb-6 leading-[0.9] sm:leading-[0.8] uppercase italic px-2">
                Project <br className="hidden sm:block" />
                <span className="text-[#76F1BC]">Analysis.</span>
              </h1>
              <p className="mt-8 text-base sm:text-lg leading-relaxed text-zinc-500 max-w-2xl mx-auto font-medium px-4 uppercase tracking-widest">
                Fast and simple code understanding<br /> for any GitHub project.
              </p>
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 px-4">
                <Link
                  to="/builder"
                  className="w-full sm:w-auto rounded-2xl bg-white px-8 py-5 sm:px-12 sm:py-6 text-xs font-black text-black shadow-2xl hover:bg-[#76F1BC] transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.3em]"
                >
                  Start Analyzing <Terminal className="w-4 h-4" />
                </Link>
                <Link to="/about" className="text-[10px] font-black leading-6 text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.4em] flex items-center gap-4 py-2">
                  How it Works <Activity className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="mt-24 sm:mt-40 space-y-16 sm:space-y-24">
             <div className="text-center max-w-2xl mx-auto space-y-4 px-4">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase italic">Simple Code Scanning.</h2>
                <p className="text-zinc-500 font-medium text-sm">Built for quick code discovery and easy AI help.</p>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                {[
                  { title: 'Project Scanning', desc: 'Scan any GitHub project quickly and get a readable summary.', icon: Database },
                  { title: 'Clear AI Help', desc: 'Ask questions about code and get simple, clear answers.', icon: Activity },
                  { title: 'Safe & Secure', desc: 'Your code is processed safely and never stored permanently.', icon: ShieldCheck },
                ].map((feature, idx) => (
                  <motion.div 
                    key={feature.title} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="notte-card p-8 sm:p-10 space-y-6 bg-white/[0.02] hover:bg-white/[0.04] border-white/5 hover:border-[#76F1BC]/30"
                  >
                     <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#76F1BC]/10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-[#76F1BC]/20">
                        <feature.icon className="w-5 h-5 text-[#76F1BC]" />
                     </div>
                     <h3 className="text-sm font-black text-white uppercase tracking-widest">{feature.title}</h3>
                     <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">{feature.desc}</p>
                  </motion.div>
                ))}
             </div>
          </div>

          <div className="mt-32 sm:mt-48 max-w-5xl mx-auto pb-24 sm:pb-32">
            <div className="flex items-center justify-between mb-8 px-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-3">
                <Terminal className="w-4 h-4 text-[#76F1BC]" /> Quick Start Examples
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {EXAMPLES.map((repo, idx) => (
                <motion.div
                  key={repo.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * idx }}
                  onClick={() => handleRepoClick(repo.url)}
                  className="notte-card p-6 sm:p-8 group cursor-pointer border-white/5 hover:border-[#76F1BC]/30 transition-all bg-white/[0.01] active:scale-97"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 sm:p-3 bg-white/5 rounded-xl group-hover:bg-[#76F1BC] transition-all transform group-hover:rotate-6">
                      <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:text-black" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#76F1BC]">Verified</span>
                  </div>
                  <h4 className="font-black text-white mb-3 truncate text-sm uppercase tracking-tight">{repo.name}</h4>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed font-medium">{repo.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
