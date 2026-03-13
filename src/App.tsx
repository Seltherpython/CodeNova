import { useState, useEffect, lazy, Suspense } from 'react';
import { Logo } from './components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database as DbIcon, 
  Key, 
  Settings as SettingsIcon, 
  LogOut, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Activity,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Github,
  Globe,
  Loader2,
  Zap,
  Cpu,
  Layers,
  User,
  ChevronUp,
  Menu,
  X
} from 'lucide-react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import SEO from './components/SEO';

// --- Extreme Performance: Lazy Loading ---
const Home = lazy(() => import('./pages/Home'));
const Builder = lazy(() => import('./pages/Builder'));
const Login = lazy(() => import('./pages/Login'));
const About = lazy(() => import('./pages/About'));

// High-Fidelity Loading Splash
const PageLoading = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 animate-in">
    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-[#76F1BC] border border-white/10 shadow-2xl animate-pulse">
      <Cpu className="w-8 h-8" />
    </div>
    <div className="flex flex-col items-center gap-2">
       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#76F1BC]">Setting Up</span>
       <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-full h-full bg-[#76F1BC]"
          />
       </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><PageLoading /></div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

const DatabasePage = () => {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/repos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setRepos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch library", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, [getToken]);

  return (
    <div className="space-y-8 sm:space-y-12 animate-in pb-20 px-4 md:px-8 pt-4 md:pt-8 w-full">
      <SEO title="Project Library | Repo Trace Personal Repository Index" description="Browse and manage your ingested GitHub repositories. Access high-fidelity code summaries and deep-dive analysis for all your saved projects." />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 px-1">
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">Project Library</h1>
          <p className="text-[11px] sm:text-sm text-zinc-500 font-medium">Your saved code projects, ready for analysis.</p>
        </div>
        <Link to="/builder" className="w-full sm:w-fit px-6 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black uppercase tracking-widest bg-[#76F1BC] text-black hover:bg-white transition-all flex items-center justify-center gap-3 rounded-xl sm:rounded-2xl shadow-lg text-decoration-none">
          <Plus className="w-4 h-4" /> Add Project
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-8">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 sm:h-64 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />)
        ) : repos.length > 0 ? repos.map((repo) => (
          <motion.div 
            key={repo.id} 
            whileHover={{ y: -4, borderColor: 'rgba(118, 241, 188, 0.3)' }}
            className="notte-card p-6 sm:p-10 space-y-6 sm:space-y-8 group cursor-pointer relative overflow-hidden active:scale-98"
            onClick={() => navigate(`/builder?id=${repo.id}`)}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
              <Github className="w-20 h-20 sm:w-24 sm:h-24 text-white" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <div className="p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10 group-hover:bg-[#76F1BC] transition-all transform group-hover:-rotate-6">
                <Github className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-black" />
              </div>
              <Activity className="w-4 h-4 text-[#76F1BC] animate-pulse" />
            </div>
            <div className="relative z-10">
              <h2 className="text-base sm:text-xl font-black text-white truncate uppercase tracking-tight mb-1">{repo.name}</h2>
              <p className="text-[9px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">{repo.owner}</p>
            </div>
            <div className="pt-5 sm:pt-8 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest relative z-10">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#76F1BC]" /> {repo.files} Files</span>
              <span>{(repo.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 sm:py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-2xl sm:rounded-3xl">
            <DbIcon className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-800 mx-auto mb-6" />
            <p className="text-base sm:text-lg font-black text-zinc-600 uppercase tracking-tight">Library is empty.</p>
            <p className="text-xs sm:text-sm text-zinc-700 mt-2 font-medium">Add your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const APIKeysPage = () => {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchKeys = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch keys", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, [getToken]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    try {
      const token = await getToken();
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newKeyName })
      });
      setNewKeyName('');
      setShowNew(false);
      fetchKeys();
    } catch (e) {
      console.error("Failed to create key", e);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchKeys();
    } catch (e) {
      console.error("Failed to delete key", e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-in pb-20 px-4 md:px-8 pt-4 md:pt-8 w-full">
      <SEO title="API Access Controls | Manage Your Repo Trace Secret Keys" description="Generate and manage secure API keys to connect Repo Trace with your favorite developer tools and external agents like Claude or OpenAI." />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 px-1">
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">API Keys</h1>
          <p className="text-[11px] sm:text-sm text-zinc-500 font-medium">Keys for connecting your projects to other tools.</p>
        </div>
        <button 
          onClick={() => setShowNew(true)}
          className="w-full sm:w-fit px-6 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black uppercase tracking-widest bg-[#76F1BC] text-black hover:bg-white transition-all flex items-center justify-center gap-3 rounded-xl sm:rounded-2xl shadow-lg"
        >
          <Plus className="w-4 h-4" /> Create Key
        </button>
      </div>

      <AnimatePresence>
        {showNew && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="notte-card p-6 sm:p-10 bg-white/[0.02]"
          >
            <form onSubmit={handleCreateKey} className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Agent Label (e.g. Claude Code Integration)" 
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full px-5 py-4 rounded-xl outline-none bg-black/20 border border-white/10 text-white text-sm font-bold placeholder:text-zinc-700 focus:border-[#76F1BC] transition-all"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-white text-black px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#76F1BC] transition-all">Create Key</button>
                <button type="button" onClick={() => setShowNew(false)} className="px-6 py-3.5 bg-white/5 text-zinc-400 rounded-xl hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-20 sm:h-24 rounded-xl sm:rounded-2xl bg-white/[0.01] animate-pulse border border-white/5" />)
        ) : keys.length > 0 ? keys.map((key) => (
          <div key={key.id} className="notte-card p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 group">
            <div className="space-y-2 sm:space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white/5 rounded-lg shrink-0">
                    <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#76F1BC]" />
                 </div>
                 <h2 className="font-black text-white text-sm sm:text-base uppercase tracking-tight truncate">{key.name || 'External Agent Key'}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <code className="text-[10px] sm:text-[11px] text-zinc-500 font-mono tracking-wider bg-black/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5">
                  {key.key.substring(0, 12)}••••••••
                </code>
                <span className="text-[8px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                  {new Date(key.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
              <button 
                onClick={() => copyToClipboard(key.key, key.id)}
                className="p-3 sm:p-4 bg-white/5 text-zinc-400 hover:text-[#76F1BC] hover:bg-white/10 rounded-lg sm:rounded-xl transition-all border border-white/5"
              >
                {copyStatus === key.id ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <button 
                onClick={() => deleteKey(key.id)}
                className="p-3 sm:p-4 bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg sm:rounded-xl transition-all border border-white/5"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )) : (
          <div className="py-20 sm:py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-2xl sm:rounded-3xl">
            <Key className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-800 mx-auto mb-6" />
            <p className="text-base sm:text-lg font-black text-zinc-600 uppercase tracking-tight">No active secrets.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { profile, logout, getToken } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!promoCode) return;
    setIsRedeeming(true);
    setPromoMessage('');
    try {
      const token = await getToken();
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: promoCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setPromoMessage(data.message);
        setPromoCode('');
      } else {
        setPromoMessage(data.error || 'Failed to redeem code.');
      }
    } catch (err: any) {
      setPromoMessage(err.message || 'Error occurred while redeeming.');
    } finally {
      setIsRedeeming(false);
    }
  };
  return (
    <div className="space-y-8 sm:space-y-12 animate-in max-w-3xl mx-auto pb-20 px-4 md:px-8 pt-4 md:pt-8">
      <SEO title="Account Settings | User Profile and System Status - Repo Trace" description="Manage your user profile, view system version details, and monitor your account status on the Repo Trace professional code analysis platform." />
      <div className="space-y-1 md:space-y-2 px-1">
        <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">My Profile</h1>
        <p className="text-[11px] sm:text-sm text-zinc-500 font-medium">Account details and environment settings.</p>
      </div>

      <div className="notte-card p-8 sm:p-12 space-y-8 sm:space-y-12 relative overflow-hidden bg-white/[0.02]">
        <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-5">
           <ShieldCheck className="w-32 h-32 sm:w-48 sm:h-48 text-[#76F1BC]" />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 relative z-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl relative group shrink-0">
            <div className="absolute inset-0 bg-[#76F1BC]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Logo className="w-10 h-10 sm:w-12 sm:h-12 text-[#76F1BC]" />
            )}
          </div>
          <div className="space-y-2 sm:space-y-3 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">{profile?.name || 'User'}</h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-bold tracking-tight break-all">{profile?.email || 'unlisted@Repo Trace.ai'}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 sm:mt-6 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-[#76F1BC] bg-[#76F1BC]/5 border border-[#76F1BC]/20 px-4 sm:px-5 py-2 rounded-full w-fit mx-auto sm:mx-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Account Verified
            </div>
          </div>
        </div>

        <div className="pt-8 sm:pt-12 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-zinc-600">System Version</p>
            <p className="text-xs sm:text-sm font-black text-white tracking-widest italic">Repo Trace App v4.8.0</p>
          </div>
          <button 
            onClick={logout}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all border border-white/5 active:scale-98"
          >
            Terminate Session <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-8 border-t border-white/10 relative z-10 space-y-4">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-zinc-600">Redeem Promotion Code</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="e.g. PRO-HOSTED-3X"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#76F1BC] transition-colors"
            />
            <button 
              onClick={handleRedeem}
              disabled={isRedeeming || !promoCode}
              className="px-6 py-3 bg-[#76F1BC] text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#5EDBA8] transition-colors disabled:opacity-50"
            >
              {isRedeeming ? 'Verifying...' : 'Redeem'}
            </button>
          </div>
          {promoMessage && (
            <p className={`text-xs font-medium uppercase tracking-widest ${promoMessage.includes('error') || promoMessage.includes('Failed') ? 'text-red-400' : 'text-[#76F1BC]'}`}>
              {promoMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="border-t border-white/5 py-16 sm:py-24 lg:py-32 bg-black">
    <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-16 lg:gap-20">
      <div className="col-span-2 space-y-6 sm:space-y-8">
        <Link to="/" className="flex items-center gap-3 text-decoration-none group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#76F1BC] rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(118,241,188,0.3)]">
            <Logo className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-black text-xl sm:text-2xl tracking-tighter text-white uppercase italic">Repo Trace</span>
        </Link>
        <p className="text-sm text-zinc-500 font-medium max-w-sm leading-relaxed">
          Simple tool for understanding GitHub code and preparing datasets for AI. Free forever.
        </p>
      </div>
      <div>
         <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white mb-5 sm:mb-8">Quick Links</h4>
         <ul className="space-y-3 sm:space-y-4">
           <li><Link to="/about" className="text-xs sm:text-sm font-bold text-zinc-600 hover:text-[#76F1BC] transition-colors text-decoration-none">Docs</Link></li>
           <li><Link to="/builder" className="text-xs sm:text-sm font-bold text-zinc-600 hover:text-[#76F1BC] transition-colors text-decoration-none">Console</Link></li>
           <li><Link to="/database" className="text-xs sm:text-sm font-bold text-zinc-600 hover:text-[#76F1BC] transition-colors text-decoration-none">Library</Link></li>
         </ul>
      </div>
      <div>
         <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white mb-5 sm:mb-8">Source</h4>
         <ul className="space-y-3 sm:space-y-4">
           <li><a href="https://github.com/Seltherpython/Repo Trace" target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-zinc-600 hover:text-[#76F1BC] transition-colors text-decoration-none">GitHub</a></li>
           <li><Link to="/about" className="text-xs sm:text-sm font-bold text-zinc-600 hover:text-[#76F1BC] transition-colors text-decoration-none">Security</Link></li>
           <li><Link to="/about" className="text-xs sm:text-sm font-bold text-zinc-600 hover:text-[#76F1BC] transition-colors text-decoration-none">License</Link></li>
         </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-12 sm:mt-24 pt-8 sm:pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-zinc-700">
       <span>© 2026 Repo Trace · Open Source</span>
       <div className="flex items-center gap-4 sm:gap-6">
         <span className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 border border-white/5 rounded-full bg-white/[0.01]">
           <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#76F1BC] animate-pulse" /> System Live 
         </span>
         <span className="text-[#76F1BC]/50">v4.8.0</span>
       </div>
    </div>
  </footer>
);

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isConsole = location.pathname.startsWith('/builder') || 
                    location.pathname.startsWith('/database') || 
                    location.pathname.startsWith('/keys') || 
                    location.pathname.startsWith('/settings');

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Analyzer', path: '/builder', icon: Logo },
    { label: 'Project Library', path: '/database', icon: DbIcon },
    { label: 'API Keys', path: '/keys', icon: Key },
    { label: 'Account', path: '/settings', icon: SettingsIcon },
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const [layoutMode, setLayoutMode] = useState<'top' | 'side'>('side');

  useEffect(() => {
    const handleLayout = (e: any) => setLayoutMode(e.detail);
    window.addEventListener('app-layout-mode', handleLayout);
    return () => window.removeEventListener('app-layout-mode', handleLayout);
  }, []);

  if (!isConsole) {
    return (
      <div className="min-h-screen bg-black">
        <nav className="border-b border-white/5 px-6 md:px-10 py-6 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
          <Link to="/" className="flex items-center gap-3 text-decoration-none group">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#76F1BC] group-hover:bg-[#76F1BC] group-hover:text-black transition-all">
              <Logo className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="font-black text-lg md:text-xl tracking-tighter text-white uppercase italic">Repo Trace</span>
          </Link>
          <div className="flex md:hidden">
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </button>
          </div>
          <div className="hidden md:flex items-center gap-12">
            <Link to="/about" className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-[#76F1BC] transition-colors text-decoration-none">Help Guide</Link>
            <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-[#76F1BC] transition-colors text-decoration-none">Sign In</Link>
            <Link to="/builder" className="bg-white text-black px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#76F1BC] transition-all text-decoration-none shadow-2xl">Get Started</Link>
          </div>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[95]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="md:hidden fixed inset-x-4 top-[88px] bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 z-[100] p-6 rounded-3xl shadow-2xl space-y-4 overflow-hidden ring-1 ring-[#76F1BC]/10"
              >
                <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-sm font-black text-zinc-400 uppercase tracking-widest hover:text-[#76F1BC] hover:bg-white/5 rounded-2xl transition-all text-decoration-none">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  Help Guide
                </Link>
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-sm font-black text-zinc-400 uppercase tracking-widest hover:text-[#76F1BC] hover:bg-white/5 rounded-2xl transition-all text-decoration-none">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  My Account
                </Link>
                <div className="pt-2">
                  <Link to="/builder" onClick={() => setIsMobileMenuOpen(false)} className="block w-full py-4 bg-[#76F1BC] text-black text-center rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-transform shadow-[0_10px_30px_rgba(118,241,188,0.2)] text-decoration-none">
                    Start Now
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><PageLoading /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black flex flex-col selection:bg-[#76F1BC] selection:text-black transition-all duration-700`}>
      {/* Mobile Top Header (Console) */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-[70]">
          <Link to="/" className="flex items-center gap-3 text-decoration-none group">
            <div className="w-8 h-8 bg-[#76F1BC] rounded-lg flex items-center justify-center text-black">
              <Logo className="w-4 h-4" />
            </div>
            <span className="font-black text-sm tracking-tighter text-white uppercase italic">Repo Trace</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 border border-white/10 rounded-lg text-[#76F1BC] bg-white/5"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
      </div>

      {/* ── Mobile Sidebar Overlay (drawer, mobile only) ───────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[85]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="md:hidden fixed inset-y-0 left-0 w-[280px] bg-black border-r border-white/10 z-[90] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-decoration-none">
                  <div className="w-10 h-10 bg-[#76F1BC] rounded-xl flex items-center justify-center text-black">
                    <Logo className="w-5 h-5" />
                  </div>
                  <span className="font-black text-lg tracking-tighter text-white uppercase italic">Repo Trace</span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-zinc-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-2 mt-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all group text-decoration-none relative ${
                      location.pathname === item.path
                        ? 'bg-white/5 text-[#76F1BC] border border-white/10'
                        : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${location.pathname === item.path ? 'text-[#76F1BC]' : 'text-zinc-700 group-hover:text-zinc-400'}`} />
                    <span className="font-black uppercase tracking-[0.2em] text-[10px]">{item.label}</span>
                    {location.pathname === item.path && <div className="absolute left-0 w-1 h-6 bg-[#76F1BC] rounded-r-full" />}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-white/5">
                <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#76F1BC]">
                    <Globe className="w-3 h-3" />
                    <span className="font-mono">US-REGION ACTIVE</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#76F1BC] h-full" style={{ width: '92%' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Top Nav bar (Permanent) ───────────────────────────── */}
      <header className="hidden md:flex items-center justify-between px-8 h-[70px] border-b border-white/5 bg-black sticky top-0 z-50 shrink-0">
        <Link to="/" className="flex items-center gap-3 text-decoration-none group">
          <div className="w-10 h-10 bg-[#76F1BC] rounded-xl flex items-center justify-center text-black group-hover:scale-105 transition-transform">
            <Logo className="w-5 h-5" />
          </div>
          <span className="font-black text-lg tracking-tighter text-white uppercase italic">Repo Trace</span>
        </Link>
        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-decoration-none ${
                location.pathname === item.path ? 'text-[#76F1BC] bg-white/5 shadow-[0_0_15px_rgba(118,241,188,0.1)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-4 py-2 border border-white/5 rounded-full bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.3em] text-[#76F1BC]">
          <span className="w-2 h-2 rounded-full bg-[#76F1BC] animate-pulse" />
          <Globe className="w-3 h-3" />
          <span className="font-mono">US-REGION</span>
        </div>
      </header>

      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/builder" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
            <Route path="/database" element={<ProtectedRoute><DatabasePage /></ProtectedRoute>} />
            <Route path="/keys" element={<ProtectedRoute><APIKeysPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/builder" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
