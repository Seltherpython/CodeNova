import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Search, 
  Zap, 
  Activity, 
  Code2, 
  FileJson, 
  Globe, 
  Shield, 
  Copy, 
  Check, 
  Bug,
  Sparkles,
  Command,
  ArrowRight,
  Database,
  CloudLightning,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';

interface RepoMetadata {
  name: string;
  owner: string;
  files: number;
  size: number;
  updatedAt: string;
}

interface IngestionData {
  id: string;
  metadata: RepoMetadata;
  perception_map: string;
  unified_content: string;
  status: 'new' | 'indexed';
}

export default function Builder() {
  const { getToken, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [data, setData] = useState<IngestionData | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'map' | 'code' | 'api' | 'plugins'>('map');
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [answer, setAnswer] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [identifierSeed, setIdentifierSeed] = useState('');
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [isGeneratingIds, setIsGeneratingIds] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const repoUrl = searchParams.get('repo');
    const repoId = searchParams.get('id');
    
    if (repoUrl) {
      setUrl(repoUrl);
      handleIngest(repoUrl);
    } else if (repoId) {
      fetchRepo(repoId);
    }
  }, [searchParams]);

  const fetchRepo = async (id: string) => {
    setIsIngesting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/repo/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Index not found in this node.");
      const result = await res.json();
      setData({ ...result, id, status: 'indexed' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleIngest = async (targetUrl?: string) => {
    const finalUrl = targetUrl || url;
    if (!finalUrl || isIngesting) return;
    
    setIsIngesting(true);
    setError('');
    setData(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Github-Token': profile?.githubToken || ''
        },
        body: JSON.stringify({ url: finalUrl })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Ingestion Protocol Failure.");
      
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || isQuerying || !data) return;
    
    setIsQuerying(true);
    setAnswer('');
    
    try {
      const token = await getToken();
      const res = await fetch(`/api/repo/${data.id}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ query })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Agent reasoning failure.");
      setAnswer(result.answer);
    } catch (err: any) {
      setAnswer(`Error: ${err.message}`);
    } finally {
      setIsQuerying(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [answer, isQuerying]);

  const copyApiRef = () => {
    const curl = `curl -X POST https://repodata.ai/api/repo/${data?.id}/chat \\
  -H "Authorization: Bearer YOUR_RP_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Explain the auth logic"}'`;
    navigator.clipboard.writeText(curl);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const generateRandomIds = async () => {
    if (!identifierSeed) return;
    setIsGeneratingIds(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/plugins/random-identifier', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ seed: identifierSeed, count: 6 })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setGeneratedIds(result.identifiers);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsGeneratingIds(false);
    }
  };

  return (
    <div className="space-y-8 animate-in pb-20">
      <SEO 
        title={data ? `${data.metadata.name} | Workbench` : "Import Workspace"} 
        description="Easy GitHub imports and code summaries for AI." 
      />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#76F1BC]" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">GitHub Importer for AI</p>
          </div>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
            <input 
              type="text" 
              placeholder="Paste a GitHub URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleIngest()}
              className="w-full pl-12 pr-32 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-zinc-900 focus:bg-white transition-all outline-none font-bold text-sm"
            />
            <button 
              onClick={() => handleIngest()}
              disabled={isIngesting || !url}
              className="absolute right-2 top-2 bottom-2 bg-black text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isIngesting ? <Loader2 className="w-4 h-4 animate-spin text-[#76F1BC]" /> : (
                <>Import <Zap className="w-4 h-4 text-[#76F1BC] fill-current" /></>
              )}
            </button>
          </div>
        </div>
        
        {data && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4">
             <div className="notte-card px-6 py-4 bg-zinc-50 border-zinc-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Size</p>
                <p className="text-sm font-black text-zinc-900">{(data.metadata.size / 1024 / 1024).toFixed(2)} MB</p>
             </div>
             <div className="notte-card px-6 py-4 bg-zinc-50 border-zinc-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Status</p>
                <p className="text-sm font-black text-[#76F1BC] uppercase">Ready</p>
             </div>
          </motion.div>
        )}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4">
          <Bug className="w-6 h-6 text-red-500" />
          <p className="text-xs font-black text-red-600 uppercase tracking-widest">{error}</p>
        </motion.div>
      )}

      {isIngesting ? (
        <div className="pt-20 text-center space-y-8 animate-in">
           <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center border border-zinc-800 mx-auto shadow-sm animate-pulse">
              <Database className="w-10 h-10 text-[#76F1BC]" />
           </div>
           <div className="space-y-4">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Importing files...</h2>
              <p className="text-zinc-500 font-medium max-w-md mx-auto">We're scanning the code and building an AI-ready summary. This usually takes less than a minute.</p>
              <div className="w-48 h-1 bg-zinc-100 rounded-full mx-auto overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="w-full h-full bg-[#76F1BC]"
                />
              </div>
           </div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-8 space-y-6">
            <div className="notte-card bg-white p-2 flex gap-2 w-fit mb-4">
               {['map', 'code', 'api', 'plugins'].map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab as any)}
                   className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     activeTab === tab ? 'bg-black text-white' : 'text-zinc-400 hover:text-zinc-600'
                   }`}
                 >
                   {tab === 'map' && 'Project Summary'}
                   {tab === 'code' && 'Full Code'}
                   {tab === 'api' && 'AI Integration'}
                   {tab === 'plugins' && 'Plugins'}
                 </button>
               ))}
            </div>

            <div className="notte-card min-h-[600px] p-0 overflow-hidden bg-white shadow-lg border-zinc-200">
               <div className="p-4 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#76F1BC]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{data.metadata.name}</span>
                  </div>
                  <Globe className="w-4 h-4 text-zinc-300" />
               </div>
               
               <div className="p-8 pb-20 max-h-[700px] overflow-y-auto custom-scrollbar">
                 <AnimatePresence mode="wait">
                    {activeTab === 'map' && (
                      <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm max-w-none prose-zinc">
                        <div className="text-zinc-700 leading-relaxed font-medium whitespace-pre-wrap">
                          {data.perception_map}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'code' && (
                      <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                           <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto">
                              {data.unified_content.substring(0, 10000)}
                              {data.unified_content.length > 10000 && "\n\n/* ... (Source truncated for speed) */"}
                           </pre>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'api' && (
                      <motion.div key="api" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">AI Access</h3>
                          <p className="text-sm text-zinc-500 font-medium">Use this endpoint to let AI models (ChatGPT, Claude) reason over this code.</p>
                        </div>
                        <div className="bg-zinc-900 p-8 rounded-3xl relative group">
                           <button onClick={copyApiRef} className="absolute right-6 top-6 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white">
                             {copyStatus ? <Check className="w-4 h-4 text-[#76F1BC]" /> : <Copy className="w-4 h-4" />}
                           </button>
                           <pre className="text-[12px] font-mono text-zinc-300 leading-loose">
                             <span className="text-[#76F1BC]">POST</span> /api/repo/{data.id}/chat{"\n"}
                             Authorization: Bearer YOUR_API_KEY{"\n"}
                             Content-Type: application/json{"\n\n"}
                             {"{"}{"\n"}
                             &nbsp;&nbsp;"query": "How is the auth handled?"{"\n"}
                             {"}"}
                           </pre>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'plugins' && (
                      <motion.div key="plugins" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 p-6 animate-in">
                        <div className="space-y-4">
                          <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Active Plugins</h3>
                          <p className="text-sm text-zinc-500 font-medium">Extend the protocol with specialized logic and data transformations.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="notte-card p-8 space-y-6 border-zinc-200">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-[#76F1BC]/10 rounded-xl flex items-center justify-center">
                                 <Sparkles className="w-5 h-5 text-[#76F1BC]" />
                               </div>
                               <div>
                                 <h4 className="font-black text-zinc-900 text-sm">Random Identifier Gen</h4>
                                 <p className="text-[10px] text-zinc-400 font-bold">LEGACY PROTOCOL</p>
                               </div>
                             </div>
                             
                             <div className="space-y-4">
                               <p className="text-xs text-zinc-500 font-medium">Generates random identifiers with similar first letters based on a seed string.</p>
                               <div className="flex gap-2">
                                 <input 
                                   type="text" 
                                   placeholder="Enter seed (e.g. 'Apple')"
                                   value={identifierSeed}
                                   onChange={(e) => setIdentifierSeed(e.target.value)}
                                   className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:border-zinc-900 transition-all"
                                 />
                                 <button 
                                   onClick={generateRandomIds}
                                   disabled={isGeneratingIds || !identifierSeed}
                                   className="bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                                 >
                                    {isGeneratingIds ? <Loader2 className="w-3 h-3 animate-spin" /> : "Run"}
                                 </button>
                               </div>
                               
                               {generatedIds.length > 0 && (
                                 <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2">
                                   {generatedIds.map((id, i) => (
                                     <span key={i} className="px-3 py-1.5 bg-zinc-900 text-[#76F1BC] text-[10px] font-mono rounded-md border border-zinc-800">
                                       {id}
                                     </span>
                                   ))}
                                 </div>
                               )}
                             </div>
                          </div>
                          
                          <div className="notte-card p-8 space-y-6 border-zinc-200 opacity-50 cursor-not-allowed">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                                 <FileJson className="w-5 h-5 text-zinc-400" />
                               </div>
                               <div>
                                 <h4 className="font-black text-zinc-900 text-sm">Schema Extractor</h4>
                                 <p className="text-[10px] text-zinc-400 font-bold">LOCKED</p>
                               </div>
                             </div>
                             <p className="text-xs text-zinc-400 font-medium italic">Available in Enterprise Node.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                 </AnimatePresence>
               </div>
            </div>
          </div>

          <div className="xl:col-span-4 sticky top-12 space-y-6">
             <div className="notte-card bg-zinc-900 border-zinc-800 p-8 min-h-[500px] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-[#76F1BC]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#76F1BC]">AI Chat</span>
                  </div>
                  <Activity className="w-4 h-4 text-zinc-700" />
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto max-h-[400px] custom-scrollbar mb-6 pr-2">
                   {!answer && !isQuerying && (
                     <div className="text-center py-10 space-y-4">
                        <Command className="w-8 h-8 text-zinc-800 mx-auto" />
                        <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Ask a question about this code</p>
                     </div>
                   )}
                   {isQuerying && (
                      <div className="flex items-start gap-4 animate-in">
                        <div className="w-8 h-8 bg-[#76F1BC]/10 rounded-lg flex items-center justify-center border border-[#76F1BC]/20">
                          <Activity className="w-4 h-4 text-[#76F1BC] animate-pulse" />
                        </div>
                        <div className="space-y-2 flex-1">
                           <div className="h-2 w-3/4 bg-zinc-800 rounded animate-pulse" />
                           <div className="h-2 w-1/2 bg-zinc-800 rounded animate-pulse" />
                        </div>
                      </div>
                   )}
                   {answer && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="text-xs text-zinc-400 leading-relaxed font-medium bg-zinc-800/20 p-4 rounded-xl border border-zinc-800/30">
                           {answer}
                        </div>
                      </motion.div>
                   )}
                   <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChat} className="relative mt-auto">
                   <input 
                     type="text" 
                     placeholder="Type your question..."
                     value={query}
                     onChange={(e) => setQuery(e.target.value)}
                     disabled={isQuerying}
                     className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#76F1BC] transition-all"
                   />
                   <button type="submit" disabled={!query || isQuerying} className="absolute right-2 top-2 bottom-2 bg-[#76F1BC] text-black px-3 rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                     <ArrowRight className="w-4 h-4" />
                   </button>
                </form>
             </div>
             <div className="notte-card p-6 bg-[#76F1BC]/5 border-[#76F1BC]/20">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-4 h-4 text-[#76F1BC]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#76F1BC]">Security Status</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium font-bold">
                  This project is isolated. We store public info for your library, but full code files are handled securely.
                </p>
             </div>
          </div>
        </div>
      ) : (
        <div className="pt-20 text-center space-y-8 animate-in">
           <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center border border-zinc-100 mx-auto shadow-sm">
              <CloudLightning className="w-10 h-10 text-[#76F1BC]" />
           </div>
           <div className="space-y-3">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Ready for Import.</h2>
              <p className="text-zinc-500 font-medium max-w-md mx-auto">Paste a GitHub link above to pull your code and start chatting with it using AI.</p>
           </div>
        </div>
      )}
    </div>
  );
}
