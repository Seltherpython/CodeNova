import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';
import { Shield, Zap, Database, Globe, Cpu, Layers, Info, Lock, Code2, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function About() {
  const sections = [
    {
      id: 'agent',
      title: 'Smart Assistant',
      icon: Cpu,
      content: 'Repo Trace uses advanced smart technology to read and understand code. We have a special local helper that handles huge projects so the main analyzer can stay fast and accurate without losing any details.'
    },
    {
      id: 'usage',
      title: 'How to use',
      icon: Logo,
      content: 'Just paste a GitHub link into the analyzer. The system will create a "Project Map" that makes the code easy for an AI to read. You can then chat with your project or edit the map yourself in the workshop area.'
    },
    {
      id: 'limits',
      title: 'Usage Limits',
      icon: Lock,
      content: 'To maintain server stability, the Repo Trace API enforces a liberal global request limit of 1000 daily AI interactions per account. You can monitor your usage thresholds on your profile dashboard.'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <SEO title="Documentation & Guide | Learn How to Use Repo Trace Effectively" description="Discover the power of Repo Trace. Our comprehensive guide explains how to analyze GitHub projects, chat with codebases, and manage your private library." />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 md:py-24">
        {/* Header Section */}
        <header className="mb-20 md:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#76F1BC]/5 border border-[#76F1BC]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#76F1BC] animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#76F1BC]">Help Guide</p>
            </div>
            <h1 className="text-4xl xs:text-5xl md:text-8xl font-black text-white tracking-tighter leading-[1] md:leading-[0.9] uppercase italic max-w-4xl px-2">
              Easy Code <br className="hidden xs:block" />
              <span className="text-[#76F1BC]">Understanding.</span>
            </h1>
            <p className="text-base md:text-xl text-zinc-500 font-medium leading-relaxed max-w-2xl px-2 uppercase tracking-widest text-[11px] md:text-sm">
              Repo Trace is a simple tool that helps you turn messy source code into clear information that AI can understand easily.
            </p>
          </motion.div>
        </header>

        {/* Documentation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 mb-32">
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="p-8 rounded-3xl md:rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-6 group hover:bg-white/[0.04] transition-all"
            >
              <div className="w-12 h-12 bg-[#76F1BC] rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(118,241,188,0.2)] group-hover:scale-110 transition-transform">
                <section.icon className="w-6 h-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">{section.title}</h2>
              <p className="text-zinc-500 text-[13px] md:text-sm leading-relaxed font-bold">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* API Usage Guide */}
        <div className="mb-32">
          <div className="flex items-center gap-4 mb-8">
             <div className="w-10 h-10 bg-[#76F1BC]/10 rounded-xl flex items-center justify-center border border-[#76F1BC]/20">
               <Globe className="w-5 h-5 text-[#76F1BC]" />
             </div>
             <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">API Integration Guide</h2>
          </div>
          <div className="notte-card p-8 md:p-12 bg-white/[0.01] border border-white/5 rounded-3xl md:rounded-[2rem] space-y-12">
            <p className="text-sm md:text-base text-zinc-400 font-bold max-w-3xl leading-relaxed">
              Repo Trace shines when used directly inside your own applications, IDE plugins, or external agent tools (like Claude Code or Cursor). Here is the step-by-step required to consume your repository AI context natively.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="text-[#76F1BC] font-black text-2xl">01</div>
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Generate an API Key</h3>
                <p className="text-sm text-zinc-500 leading-relaxed font-bold">
                  Navigate to your <strong>API Keys</strong> tab in the console and create a new key. Keep this key secure, as it maps directly to your account's 1000 daily request quota.
                </p>
              </div>
              <div className="space-y-4">
                <div className="text-[#76F1BC] font-black text-2xl">02</div>
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Grab the Repo Context</h3>
                <p className="text-sm text-zinc-500 leading-relaxed font-bold">
                  Extract the heavily compressed, AI-optimized text version of any previously ingested repository using a standard <code>GET</code> request without any authentication hurdles.
                </p>
              </div>
              <div className="space-y-4">
                <div className="text-[#76F1BC] font-black text-2xl">03</div>
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Prompt the AI Engine</h3>
                <p className="text-sm text-zinc-500 leading-relaxed font-bold">
                  Send complex architectural queries to the <code>/api/repo/:id/chat</code> endpoint via <code>POST</code>. Be sure to add your API Key in the <code>Authorization: Bearer</code> header.
                </p>
              </div>
            </div>

            <div className="bg-black border border-white/10 rounded-2xl p-6 overflow-x-auto custom-scrollbar">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">Integrating with Python (Requests)</span>
              </div>
              <pre className="text-[11px] md:text-xs font-mono text-zinc-300">
<span className="text-purple-400">import</span> requests{"\n"}
<span className="text-purple-400">import</span> json{"\n"}{"\n"}
<span className="text-zinc-500"># Define your request parameters</span>{"\n"}
url = <span className="text-green-300">"https://Repo Trace.ai/api/repo/YOUR_REPO_ID/chat"</span>{"\n"}
headers = {"{"}{"\n"}  <span className="text-green-300">"Authorization"</span>: <span className="text-green-300">"Bearer YOUR_API_KEY"</span>,{"\n"}  <span className="text-green-300">"Content-Type"</span>: <span className="text-green-300">"application/json"</span>{"\n"}{"}"}{"\n"}
payload = {"{"} <span className="text-green-300">"query"</span>: <span className="text-green-300">"Find a way to optimize the auth module."</span> {"}"}{"\n"}{"\n"}
<span className="text-zinc-500"># Send the structural analysis prompt</span>{"\n"}
response = requests.post(url, headers=headers, data=json.dumps(payload)){"\n"}{"\n"}
<span className="text-blue-400">print</span>(response.json()[<span className="text-green-300">"answer"</span>])
              </pre>
            </div>
          </div>
        </div>


        {/* Technical Deep Dive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 mb-32">
          <div className="space-y-12">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-[#76F1BC]" />
                <h3 className="text-xl font-black text-white uppercase tracking-widest">Smart Compression</h3>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed font-bold">
                If your project is too big for the AI to read at once, our system automatically simplifies it first. 
                This local helper runs directly on the server to make the project smaller while keeping all the important parts for you to see.
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#76F1BC]" />
                <h3 className="text-xl font-black text-white uppercase tracking-widest">Your Privacy</h3>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed font-bold">
                Keeping your code safe is our top priority. Once you finish your session, any data we processed is cleared from our temporary memory. We never store your code permanently.
              </p>
            </section>
          </div>

          <div className="notte-card p-8 md:p-12 bg-zinc-900/50 border border-white/5 rounded-3xl md:rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0">
               <Layers className="w-48 h-48 text-white" />
            </div>
            <div className="flex items-center gap-4 mb-8">
               <Rocket className="w-6 h-6 text-[#76F1BC]" />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#76F1BC]">Get Started</span>
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic mb-8">Ready to <br className="hidden xs:block" /> Analyze?</h3>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
              <Link to="/builder" className="flex-1 py-5 bg-[#76F1BC] text-black text-center rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl">
                Open Analyzer
              </Link>
              <a href="https://github.com/Seltherpython/Repo Trace" target="_blank" className="flex-1 py-5 border border-white/10 text-white text-center rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/5 transition-all">
                View GitHub Source
              </a>
            </div>
          </div>
        </div>

        {/* System Rules Footer */}
        <footer className="pt-24 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                <Logo className="w-4 h-4 text-[#76F1BC]" />
              </div>
              <span className="font-black text-white uppercase italic">Repo Trace</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-bold leading-relaxed uppercase tracking-widest">
              Built for simple code help and easy developer workflows.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-4">Support</h4>
              <p className="text-sm text-zinc-500 font-bold leading-relaxed">
                Repo Trace is open to everyone. You can find us on GitHub if you want to help make the code smarter.
              </p>
            </div>
            <div>
               <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-4">Location</h4>
               <p className="text-sm text-zinc-500 font-bold leading-relaxed">
                 Server zones active across US regions. Fast processing for any user globally.
               </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
