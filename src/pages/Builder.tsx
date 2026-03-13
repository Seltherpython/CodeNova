import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Zap, Activity, Code2, FileJson, Globe, Shield, Copy, Check, Bug,
  Sparkles, Command, ArrowRight, Database, CloudLightning, Loader2, Cpu, Layers,
  Github, RefreshCw, Download, Edit3, X, FileText, Key, ExternalLink, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';

interface RepoMetadata {
  name: string; owner: string; repo?: string;
  files: number; size: number; updatedAt: string;
  lastApiUsage?: string | null;
  _lastApiUsage?: string | null;
}
interface IngestionData {
  id: string; metadata: RepoMetadata;
  perception_map: string; unified_content: string;
  status?: string;
}
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string; timestamp: number;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-white font-black uppercase tracking-widest text-xs mt-4 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('## '))  return <h2 key={i} className="text-[#76F1BC] font-black uppercase tracking-widest text-xs mt-6 mb-2 border-b border-white/5 pb-2">{line.slice(3)}</h2>;
        if (line.startsWith('# '))   return <h1 key={i} className="text-white font-black text-base mt-6 mb-3">{line.slice(2)}</h1>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-white font-bold text-xs">{line.slice(2,-2)}</p>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-zinc-400 text-xs flex gap-2"><span className="text-[#76F1BC] shrink-0">›</span>{line.slice(2)}</p>;
        if (line.startsWith('```')) return null;
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-zinc-400 text-xs">{line}</p>;
      })}
    </div>
  );
}

// ─── Code block with copy ─────────────────────────────────────────────────────
function CopyBlock({ code, lang = '' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group bg-black/60 rounded-xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <span className="text-[9px] font-mono text-zinc-600 uppercase">{lang || 'text'}</span>
        <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 transition-all text-zinc-600 hover:text-white">
          {copied ? <Check className="w-3.5 h-3.5 text-[#76F1BC]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-4 text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto max-h-64 custom-scrollbar">{code}</pre>
    </div>
  );
}

export default function Builder() {
  const { getToken, profile } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Core state
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<IngestionData | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'map' | 'file' | 'api' | 'plugins'>('map');
  
  // Chat
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Context file editor
  const [contextFile, setContextFile] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [aiEditInstruction, setAiEditInstruction] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [fileSaved, setFileSaved] = useState(false);

  // API tab
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Plugins
  const [identifierSeed, setIdentifierSeed] = useState('');
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [isGeneratingIds, setIsGeneratingIds] = useState(false);
  const [ollamaModel, setOllamaModel] = useState(localStorage.getItem('rp_ollama_model') || '');

  // ─── On mount: read URL params ──────────────────────────────────────────
  useEffect(() => {
    const repoUrl = searchParams.get('url') || searchParams.get('repo');
    const repoId  = searchParams.get('id');
    if (repoUrl) { setUrl(repoUrl); handleIngest(repoUrl); }
    else if (repoId) fetchRepo(repoId);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isQuerying]);

  const getHeaders = async () => {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
    if (profile?.githubToken) headers['X-Github-Token'] = profile.githubToken;
    if (ollamaModel) headers['X-Ollama-Model'] = ollamaModel;
    return headers;
  };

  // ─── Fetch existing repo ────────────────────────────────────────────────
  const fetchRepo = async (id: string) => {
    setIsIngesting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/repo/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Repo not found.');
      const result = await res.json();
      setData({ ...result, id, status: 'indexed' });
      loadChatHistory(id);
      fetchContextFile(id);
    } catch (err: any) { setError(err.message); }
    finally { setIsIngesting(false); }
  };

  // ─── Load context file ──────────────────────────────────────────────────
  const fetchContextFile = async (id: string) => {
    try {
      const res = await fetch(`/api/repo/${id}/context.txt`);
      if (res.ok) setContextFile(await res.text());
    } catch {}
  };

  const loadChatHistory = (id: string) => {
    const saved = localStorage.getItem(`rp_chat_${id}`);
    if (saved) { try { setMessages(JSON.parse(saved)); } catch {} }
    else setMessages([]);
  };

  // ─── Ingest ─────────────────────────────────────────────────────────────
  const handleIngest = async (targetUrl?: string) => {
    const finalUrl = targetUrl || url;
    if (!finalUrl || isIngesting) return;
    setIsIngesting(true); setError(''); setData(null); setContextFile('');
    try {
      const hdrs = await getHeaders();
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ url: finalUrl }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Ingestion failed.');
      
      // Clear old chat history for fresh url ingestions requested by the user
      localStorage.removeItem(`rp_chat_${result.id}`);
      setMessages([]);
      
      setData(result);
      await fetchContextFile(result.id);
    } catch (err: any) { setError(err.message); }
    finally { setIsIngesting(false); }
  };

  // ─── Refresh ────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!data || !url || isRefreshing) return;
    setIsRefreshing(true); setError('');
    try {
      const hdrs = await getHeaders();
      const res = await fetch(`/api/repo/${data.id}/refresh`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ url }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Refresh failed.');
      setData(result);
      await fetchContextFile(result.id);
    } catch (err: any) { setError(err.message); }
    finally { setIsRefreshing(false); }
  };

  // ─── Chat ───────────────────────────────────────────────────────────────
  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || isQuerying) return;

    if (!data) {
      setUrl(query);
      handleIngest(query);
      setQuery('');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: query, timestamp: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setQuery(''); setIsQuerying(true);
    try {
      const hdrs = await getHeaders();
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`/api/repo/${data.id}/chat`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ query, history }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Chat failed.');
      const asstMsg: ChatMessage = { role: 'assistant', content: result.answer, timestamp: Date.now() };
      const final = [...newMsgs, asstMsg];
      setMessages(final);
      localStorage.setItem(`rp_chat_${data.id}`, JSON.stringify(final));
      setData(prev => prev ? ({...prev, metadata: {...prev.metadata, lastApiUsage: new Date().toISOString()}}) : null);
    } catch (err: any) {
      setMessages(p => [...p, { role: 'system', content: `Error: ${err.message}`, timestamp: Date.now() }]);
    } finally { setIsQuerying(false); }
  };

  // ─── Context file save ──────────────────────────────────────────────────
  const saveContextFile = async () => {
    if (!data) return;
    try {
      const token = await getToken();
      await fetch(`/api/repo/${data.id}/context.txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: contextFile }),
      });
      setFileSaved(true); setIsEditingFile(false);
      setTimeout(() => setFileSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
  };

  // ─── AI edit context file ───────────────────────────────────────────────
  const handleAiEdit = async () => {
    if (!data || !aiEditInstruction) return;
    setIsAiEditing(true);
    try {
      const hdrs = await getHeaders();
      const res = await fetch(`/api/repo/${data.id}/ai-edit`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ instruction: aiEditInstruction }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchContextFile(data.id);
      setAiEditInstruction('');
    } catch (err: any) { setError(err.message); }
    finally { setIsAiEditing(false); }
  };

  // ─── Download context file ──────────────────────────────────────────────
  const handleDownload = async () => {
    if (!data) return;
    const token = await getToken();
    window.open(`/api/repo/${data.id}/download?token=${token}`, '_blank');
  };

  // ─── Copy helper ────────────────────────────────────────────────────────
  const copySnippet = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // ─── Random IDs ─────────────────────────────────────────────────────────
  const generateRandomIds = async () => {
    if (!identifierSeed) return;
    setIsGeneratingIds(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/plugins/random-identifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seed: identifierSeed, count: 6 }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setGeneratedIds(result.identifiers);
    } catch (e: any) { console.error(e); }
    finally { setIsGeneratingIds(false); }
  };

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://repodata.ai';

  const TABS = [
    { id: 'map',     label: 'Summary', icon: Layers   },
    { id: 'file',    label: 'Project Map', icon: FileText  },
    { id: 'api',     label: 'Helper API',  icon: Globe    },
    { id: 'plugins', label: 'Extras',      icon: Sparkles },
  ] as const;

  const isEmpty = !isIngesting && !isRefreshing && !data;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('app-layout-mode', { detail: isEmpty ? 'top' : 'side' }));
  }, [isEmpty]);

  return (
    <div className="space-y-4 animate-in pb-16 relative px-4 md:px-6 pt-4 md:pt-6">
      <SEO
        title={data ? `${data.metadata.name} | AI Code Workbench - Repodata AI` : 'Analyze Your Project | Repodata AI Advanced Code Insights'}
        description="Decode any GitHub repository with Nova. Get high-fidelity project maps, smart reasoning, and instant code summaries on the Repodata AI workbench."
      />

      <div>
        {isEmpty && (
          <div className="text-center space-y-3 mb-6 animate-in zoom-in-95 duration-700">
            <div className="w-14 h-14 bg-[#76F1BC]/5 rounded-2xl flex items-center justify-center border border-[#76F1BC]/20 mx-auto">
              <Cpu className="w-7 h-7 text-[#76F1BC]" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic">Project Analyzer</h1>
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.25em] max-w-xs mx-auto">
              Paste a GitHub URL below to get started.
            </p>
          </div>
        )}

        {/* ── Ingest header ── */}
        <div className={`w-full transition-all duration-700 ease-out z-20 ${isEmpty ? 'max-w-3xl mx-auto notte-card p-6 md:p-10 bg-[#060606] border border-[#76F1BC]/30 shadow-[0_0_80px_rgba(118,241,188,0.15)] ring-1 ring-[#76F1BC]/10' : 'notte-card p-4 md:p-8 bg-white/[0.02] border-white/5'} space-y-4 md:space-y-5`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEmpty ? 'bg-white/10' : 'bg-[#76F1BC]/10'}`}>
              <Cpu className={`w-4 h-4 ${isEmpty ? 'text-zinc-300' : 'text-[#76F1BC]'}`} />
            </div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Project Analyzer <span className="hidden sm:inline">v4.9 Pulse</span>
            </p>
            {data && (
              <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-zinc-700">
                Resync {new Date(data.metadata.updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Github className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isEmpty ? 'text-zinc-500 group-focus-within:text-[#76F1BC]' : 'text-zinc-600'}`} />
              <input
                type="text"
                placeholder="github.com/owner/repo"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleIngest()}
                className={`w-full pl-11 pr-4 py-3 md:py-4 border rounded-xl outline-none font-bold text-sm text-white transition-all ${isEmpty ? 'bg-black border-[#76F1BC]/30 focus:border-[#76F1BC] shadow-inner placeholder:text-zinc-600' : 'bg-black/40 border-white/10 focus:border-[#76F1BC] placeholder:text-zinc-700'}`}
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleIngest()}
                disabled={isIngesting || !url}
                className="flex-1 sm:flex-none bg-[#76F1BC] text-black px-6 md:px-10 py-3 md:py-4 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isIngesting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <><Zap className="w-4 h-4 shrink-0" /> Analyze</>}
              </button>

              {data && url && !isEmpty && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || isIngesting}
                  title="Re-sync repo from GitHub"
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#76F1BC]/40 transition-all text-zinc-400 hover:text-[#76F1BC] disabled:opacity-50"
                >
                  {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {!isEmpty && data && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 md:gap-3">
              <div className="notte-card px-3 md:px-4 py-1.5 md:py-2.5 bg-white/[0.01] border-white/5">
                <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-0.5">Shards</p>
                <p className="text-xs md:text-sm font-black text-white italic">{data.metadata.files}</p>
              </div>
              <div className="notte-card px-3 md:px-4 py-1.5 md:py-2.5 bg-white/[0.01] border-white/5">
                <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-0.5">Capacity</p>
                <p className="text-xs md:text-sm font-black text-white italic">{(data.metadata.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="notte-card px-3 md:px-4 py-1.5 md:py-2.5 bg-white/[0.01] border-white/5">
                <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-0.5">Protocol</p>
                <p className="text-xs md:text-sm font-black text-[#76F1BC] uppercase italic">Active</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 mx-1"
          >
            <Bug className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {isIngesting ? (
          <div className="py-12 text-center space-y-5 animate-in">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mx-auto relative">
              <div className="absolute inset-0 bg-[#76F1BC]/10 animate-ping rounded-2xl" />
              <Database className="w-7 h-7 text-[#76F1BC]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic">Analyzing…</h2>
              <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest max-w-xs mx-auto">
                Reading files · Nova at work
              </p>
              <div className="w-36 h-0.5 bg-white/5 rounded-full mx-auto overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }} animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  className="w-full h-full bg-[#76F1BC]"
                />
              </div>
            </div>
          </div>

        ) : data ? (
          /* ── Main Layout Grid ── */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 items-start">
            
            {/* ── Project Content/Tabs (Secondary on mobile, main on desktop) ── */}
            <div className="xl:col-span-8 space-y-6 order-2 xl:order-1">
              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2.5 px-5 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-[#76F1BC] text-black border-[#76F1BC] shadow-[0_0_20px_rgba(118,241,188,0.2)] scale-[1.02]'
                        : 'bg-white/5 text-zinc-500 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="notte-card overflow-hidden bg-white/[0.02] border-white/5 shadow-2xl">
                <div className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-3.5 h-3.5 text-[#76F1BC]" />
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 italic truncate max-w-[140px] sm:max-w-none">
                      {data.metadata.owner}/{data.metadata.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#76F1BC] animate-pulse" />
                    <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest hidden sm:block">Live</span>
                  </div>
                </div>

                <div className="p-6 md:p-10 min-h-[400px] max-h-[600px] md:max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
                  <AnimatePresence mode="wait">

                    {/* Summary tab */}
                    {activeTab === 'map' && (
                      <motion.div key="map" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <MarkdownContent text={data.perception_map} />
                      </motion.div>
                    )}

                    {/* Project Map tab */}
                    {activeTab === 'file' && (
                      <motion.div key="file" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        <div className="flex flex-wrap items-center gap-3 justify-between">
                          <div>
                            <h2 className="text-base md:text-lg font-black text-white uppercase italic tracking-tight">Project Map</h2>
                            <p className="text-[10px] text-zinc-500 mt-0.5">A clear overview of the current analyzed project.</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setIsEditingFile(f => !f)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isEditingFile ? 'bg-[#76F1BC] text-black border-[#76F1BC]' : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white'}`}>
                              <Edit3 className="w-3 h-3" /> {isEditingFile ? 'Editing' : 'Edit'}
                            </button>
                            {isEditingFile && (
                              <button onClick={saveContextFile}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-black hover:bg-[#76F1BC] transition-all">
                                {fileSaved ? <Check className="w-3 h-3" /> : 'Save'}
                              </button>
                            )}
                            <button onClick={handleDownload}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-zinc-400 border border-white/5 hover:text-white transition-all">
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* AI edit bar */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="AI instruction: e.g. 'Add setup instructions', 'Summarize auth module'…"
                            value={aiEditInstruction}
                            onChange={e => setAiEditInstruction(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAiEdit()}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-mono text-white placeholder:text-zinc-800 outline-none focus:border-[#76F1BC] transition-all"
                          />
                          <button
                            onClick={handleAiEdit}
                            disabled={!aiEditInstruction || isAiEditing}
                            className="px-4 py-3 bg-[#76F1BC]/10 border border-[#76F1BC]/20 rounded-xl text-[#76F1BC] hover:bg-[#76F1BC]/20 transition-all disabled:opacity-50"
                          >
                            {isAiEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          </button>
                        </div>

                        {isEditingFile ? (
                          <textarea
                            value={contextFile}
                            onChange={e => setContextFile(e.target.value)}
                            className="w-full h-64 md:h-96 bg-black/50 border border-[#76F1BC]/30 rounded-xl p-4 text-[11px] font-mono text-zinc-300 outline-none resize-none custom-scrollbar leading-relaxed"
                          />
                        ) : (
                          <div className="bg-black/50 border border-white/5 rounded-xl p-4 max-h-64 md:max-h-96 overflow-auto custom-scrollbar">
                            <pre className="text-[10px] md:text-[11px] font-mono text-zinc-500 leading-relaxed whitespace-pre-wrap">
                              {contextFile || (data?.unified_content ? data.unified_content.substring(0, 8000) + '\n\n[... truncated for display]' : 'No content available.')}
                            </pre>
                          </div>
                        )}

                        {/* Public URL */}
                        <div className="flex items-center gap-3 p-3 md:p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                          <Globe className="w-4 h-4 text-[#76F1BC] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Public Context URL (for AI agents)</p>
                            <code className="text-[10px] text-zinc-400 font-mono truncate block">{BASE_URL}/api/repo/{data.id}/context.txt</code>
                          </div>
                          <button onClick={() => copySnippet(`${BASE_URL}/api/repo/${data.id}/context.txt`, 'ctx-url')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all shrink-0">
                            {copiedSnippet === 'ctx-url' ? <Check className="w-3.5 h-3.5 text-[#76F1BC]" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* API tab */}
                    {activeTab === 'api' && (
                      <motion.div key="api" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight mb-1">Project API</h2>
                            <p className="text-[11px] text-zinc-500">Connect this project to other tools using simple API calls.</p>
                          </div>
                          {data.metadata.lastApiUsage ? (
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Last API Usage</p>
                              <p className="text-[11px] text-[#76F1BC] font-mono">
                                {new Date(data.metadata.lastApiUsage).toLocaleString()}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        {/* Endpoint 1: Public context */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 px-2 py-1 rounded uppercase">GET</span>
                            <span className="text-[10px] font-mono text-zinc-400">Public — no auth needed</span>
                          </div>
                          <CopyBlock code={`GET ${BASE_URL}/api/repo/${data.id}/context.txt\n\n# Returns the full LLM-ready context file as plain text.`} lang="bash" />
                        </div>

                        {/* Endpoint 2: Chat */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black bg-green-500/20 text-green-300 px-2 py-1 rounded uppercase">POST</span>
                            <span className="text-[10px] font-mono text-zinc-400">Chat with this repo</span>
                          </div>
                          <CopyBlock code={`curl -X POST ${BASE_URL}/api/repo/${data.id}/chat \\\n  -H "Authorization: Bearer YOUR_RP_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"query": "Can you explain this codebase like I am a beginner?", "history": []}'`} lang="bash" />
                        </div>

                        {/* Endpoint 3: Refresh */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded uppercase">POST</span>
                            <span className="text-[10px] font-mono text-zinc-400">Re-sync from GitHub</span>
                          </div>
                          <CopyBlock code={`curl -X POST ${BASE_URL}/api/repo/${data.id}/refresh \\\n  -H "Authorization: Bearer YOUR_RP_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://github.com/${data.metadata.owner}/${data.metadata.repo || data.metadata.name}"}'`} lang="bash" />
                        </div>

                        {/* OpenAI-compatible system prompt snippet */}
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Add as extended context in any AI agent</p>
                          <CopyBlock code={`# Fetch the live context and use as system prompt\nimport requests\n\ncontext = requests.get("${BASE_URL}/api/repo/${data.id}/context.txt").text\n\nmessages = [\n    {"role": "system", "content": f"You have access to this codebase:\\\\n{context}"},\n    {"role": "user",   "content": "Your question here"}\n]`} lang="python" />
                        </div>
                      </motion.div>
                    )}

                    {/* Plugins tab */}
                    {activeTab === 'plugins' && (
                      <motion.div key="plugins" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div>
                          <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight mb-1">Extension Modules</h2>
                          <p className="text-[11px] text-zinc-500">Utility accelerators for code transformation and AI workflows.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {/* Identifier generator */}
                          <div className="notte-card p-5 md:p-7 space-y-5 bg-white/[0.01] border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#76F1BC]/10 rounded-xl flex items-center justify-center border border-[#76F1BC]/20">
                                <Sparkles className="w-5 h-5 text-[#76F1BC]" />
                              </div>
                              <div>
                                <h4 className="font-black text-white text-sm uppercase tracking-tight">Identifier Gen</h4>
                                <p className="text-[8px] text-zinc-600 font-black tracking-widest uppercase">Protocol v1</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">Derives deterministic pseudorandom identifiers from a seed string.</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Seed string…"
                                value={identifierSeed}
                                onChange={e => setIdentifierSeed(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && generateRandomIds()}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] font-mono outline-none focus:border-[#76F1BC] text-white transition-all placeholder:text-zinc-800"
                              />
                              <button onClick={generateRandomIds} disabled={isGeneratingIds || !identifierSeed}
                                className="px-4 py-2.5 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#76F1BC] transition-all disabled:opacity-50">
                                {isGeneratingIds ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'EXEC'}
                              </button>
                            </div>
                            {generatedIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                                {generatedIds.map((id, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-black text-[#76F1BC] text-[9px] font-mono rounded-lg border border-white/5">{id}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Ollama Settings card */}
                          <div className="notte-card p-5 md:p-7 space-y-5 bg-white/[0.01] border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#76F1BC]/10 rounded-xl flex items-center justify-center border border-[#76F1BC]/20">
                                <Terminal className="w-5 h-5 text-[#76F1BC]" />
                              </div>
                              <div>
                                <h4 className="font-black text-white text-sm uppercase tracking-tight">Ollama Bridge</h4>
                                <p className="text-[8px] text-zinc-600 font-black tracking-widest uppercase">Local AI protocol</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                              Redirect reasoning tasks to your local Ollama instance. Set a model to override Gemini.
                            </p>
                            <div className="space-y-3">
                              <input 
                                type="text"
                                placeholder="Model (e.g. llama3, mistral)..."
                                value={ollamaModel}
                                onChange={(e) => {
                                  setOllamaModel(e.target.value);
                                  localStorage.setItem('rp_ollama_model', e.target.value);
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] font-mono text-white placeholder:text-zinc-800 outline-none focus:border-[#76F1BC] transition-all"
                              />
                              <p className="text-[9px] text-zinc-700 italic">Leave empty to use Gemini 3.1 Flash Lite.</p>
                            </div>
                          </div>

                          {/* AI Context Edit card */}
                          <div className="notte-card p-5 md:p-7 space-y-5 bg-white/[0.01] border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#76F1BC]/10 rounded-xl flex items-center justify-center border border-[#76F1BC]/20">
                                <Edit3 className="w-5 h-5 text-[#76F1BC]" />
                              </div>
                              <div>
                                <h4 className="font-black text-white text-sm uppercase tracking-tight">AI File Editor</h4>
                                <p className="text-[8px] text-zinc-600 font-black tracking-widest uppercase">Protocol v1</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                              Issue an instruction and Nova will modify your context file. Changes sync to the live API instantly.
                            </p>
                            <div className="space-y-3">
                              <textarea
                                rows={3}
                                placeholder="e.g. Add a section explaining this repo in simple words…"
                                value={aiEditInstruction}
                                onChange={e => setAiEditInstruction(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] font-mono text-white placeholder:text-zinc-800 outline-none focus:border-[#76F1BC] transition-all resize-none"
                              />
                              <button onClick={handleAiEdit} disabled={!aiEditInstruction || isAiEditing}
                                className="w-full py-3 bg-[#76F1BC]/10 border border-[#76F1BC]/20 text-[#76F1BC] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#76F1BC]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {isAiEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Apply AI Edit</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── AI Interaction Panel (Nova Chat - Priority on mobile) ── */}
            <div className="xl:col-span-4 xl:sticky xl:top-24 space-y-5 order-1 xl:order-2">
              <div className="notte-card bg-[#0A0A0A] border-white/5 p-5 md:p-8 h-[500px] md:h-[calc(100vh-160px)] flex flex-col shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#76F1BC]/40 to-transparent" />

                <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#76F1BC]/10 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-[#76F1BC]" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white">AI HELPER (Nova)</span>
                  </div>
                  {messages.length > 0 && (
                    <button onClick={() => { setMessages([]); localStorage.removeItem(`rp_chat_${data.id}`); }}
                      title="Clear chat" className="p-1.5 rounded-lg hover:bg-white/10 transition-all text-zinc-700 hover:text-zinc-400">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar mb-4 pr-1">
                  {messages.length === 0 && !isQuerying && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                      <Command className="w-8 h-8 text-zinc-800" />
                      <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] leading-relaxed italic">
                        Nova is Ready.<br />Ask about the project.
                      </p>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1.5`}>
                      <div className={`px-3.5 py-2.5 rounded-xl text-[11px] leading-relaxed max-w-[95%] border ${
                        msg.role === 'user'
                          ? 'bg-white/5 border-white/10 text-white rounded-tr-none'
                          : msg.role === 'system'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-[#111] border-white/5 text-zinc-300 rounded-tl-none italic'
                      }`}>
                        {msg.content}
                      </div>
                      <span className={`text-[7px] font-black uppercase tracking-widest px-1 ${msg.role === 'user' ? 'text-zinc-700' : 'text-[#76F1BC]'}`}>
                        {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Nova'}
                      </span>
                    </motion.div>
                  ))}

                  {isQuerying && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-[#76F1BC]/10 rounded-lg flex items-center justify-center border border-[#76F1BC]/20 shrink-0">
                        <Activity className="w-3.5 h-3.5 text-[#76F1BC] animate-pulse" />
                      </div>
                      <div className="space-y-2 flex-1 pt-1.5">
                        <div className="h-1.5 w-3/4 bg-white/5 rounded-full animate-pulse" />
                        <div className="h-1.5 w-1/2 bg-white/5 rounded-full animate-pulse" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChat} className="relative pt-3 border-t border-white/5">
                  <input
                    type="text"
                    placeholder="Ask Nova about the codebase…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    disabled={isQuerying}
                    className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3 text-[11px] text-white placeholder:text-zinc-800 outline-none focus:border-[#76F1BC] transition-all font-mono"
                  />
                  <button type="submit" disabled={!query || isQuerying}
                    className="absolute right-2 top-[calc(0.75rem+3px)] bottom-2 px-3 bg-[#76F1BC] text-black rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              <div className="notte-card p-4 md:p-6 bg-[#76F1BC]/5 border-[#76F1BC]/15 flex items-start gap-3">
                <Shield className="w-4 h-4 text-[#76F1BC] shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-500 leading-relaxed font-bold italic">
                  Context files are isolated per repo. Public URL exposes read-only context — no credentials.
                </p>
              </div>
            </div>

          </div>

        ) : (
          /* ── Empty state ── */
          <div className="py-10 text-center space-y-4 animate-in px-4">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mx-auto relative group">
              <div className="absolute inset-0 bg-[#76F1BC]/5 rounded-2xl group-hover:scale-110 transition-transform" />
              <CloudLightning className="w-7 h-7 text-[#76F1BC] relative z-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Dormant.</h2>
              <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.25em] max-w-xs mx-auto">
                Paste a GitHub link above to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
