import { motion } from 'framer-motion';
import { Shield, Zap, Database, Terminal, Globe, Code2, Users, ArrowRight, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <SEO title="How it works | Documentation" description="Learn how Repodata helps you prepare code for AI." />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#76F1BC]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Documentation</p>
            </div>
            <h1 className="text-5xl font-black text-zinc-900 tracking-tighter sm:text-7xl leading-none">
              How it <br />
              <span className="text-[#76F1BC]">Works.</span>
            </h1>
            <p className="text-xl text-zinc-500 font-medium leading-relaxed max-w-2xl">
              Repodata is a simple tool to prepare codebases for AI analysis. We help you turn messy folders into clean, organized text files that any LLM can understand.
            </p>
          </motion.div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-16">
          <section className="space-y-8">
            <div className="p-10 notte-card bg-zinc-50 border-zinc-100 space-y-6">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-[#76F1BC]">
                <Database className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Smart Importer</h2>
              <p className="text-zinc-500 font-medium leading-relaxed">
                We scan your GitHub project, remove non-essential files (like images and build logs), and combine everything into a single file for your AI prompts.
              </p>
              <ul className="space-y-4 pt-4">
                {[
                  'Clean coding files only',
                  'One-file consolidation',
                  'Instant AI summaries'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Shield className="w-3.5 h-3.5 text-[#76F1BC]" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-10 notte-card border-zinc-100 space-y-6">
              <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                <Shield className="w-6 h-6 text-[#76F1BC]" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Safe & Secure</h2>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Your code is handled with care. Every import is processed locally on your machine or in an isolated cloud environment. We don't train on your data.
              </p>
            </div>
          </section>

          <section className="space-y-8 pt-12 md:pt-0">
             <div className="notte-card p-10 bg-black text-white space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <Zap className="w-5 h-5 text-[#76F1BC] fill-current" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#76F1BC]">Get Started</span>
                </div>
                <h3 className="text-3xl font-black tracking-tight">Quick Launch.</h3>
                <div className="space-y-4 font-mono text-xs text-zinc-400">
                  <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-zinc-600">#</span> Install dependencies<br />
                    <span className="text-zinc-600">$</span> npm run build<br />
                    <span className="text-zinc-600">$</span> npm start
                  </div>
                </div>
             </div>

             <div className="p-10 notte-card border-zinc-100 space-y-6">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Our Goal</h2>
                <p className="text-zinc-500 font-medium leading-relaxed">
                  We want to make the tools for building with AI accessible to everyone. No complexity, just clean data for better results.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                   <a href="https://github.com" target="_blank" className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all text-decoration-none">
                      <Github className="w-5 h-5 text-zinc-900" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">GitHub</span>
                   </a>
                   <Link to="/builder" className="flex items-center gap-2 p-3 bg-[#76F1BC] rounded-xl hover:opacity-90 transition-all text-decoration-none">
                      <Terminal className="w-5 h-5 text-black" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-black">Open App</span>
                   </Link>
                </div>
             </div>
          </section>
        </div>

        <div className="mt-40 pt-20 border-t border-zinc-100 max-w-3xl">
           <h2 className="text-3xl font-black text-zinc-900 tracking-tighter mb-8">Fine Print</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Privacy</h4>
                <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                  We only store the project name and size for your library. Your source code files are processed and then deleted from our cache after you finish.
                </p>
             </div>
             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Terms</h4>
                <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                  Repodata works best with public repos. For private ones, make sure you have the owner's permission before importing.
                </p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
