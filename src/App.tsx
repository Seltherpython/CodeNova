import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  Database as DbIcon, 
  Terminal, 
  Key, 
  Settings as SettingsIcon, 
  LogOut, 
  Plus, 
  Search, 
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
  Zap
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
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-[#76F1BC] shadow-sm animate-pulse">
      <Terminal className="w-6 h-6" />
    </div>
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
       Initializing Protocol <span className="flex h-1 w-1 rounded-full bg-[#76F1BC] animate-ping" />
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><PageLoading /></div>;
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
    <div className="space-y-8 animate-in">
      <SEO title="Library" description="Your persistent repository index." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Library Index</h1>
          <p className="text-xs text-zinc-500 font-medium">Persistent repository nodes in your cluster.</p>
        </div>
        <Link to="/builder" className="notte-card px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-zinc-800 transition-all flex items-center gap-2">
          <Plus className="w-3 h-3 text-[#76F1BC]" /> New Ingestion
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl bg-zinc-50 animate-pulse border border-zinc-100" />)
        ) : repos.length > 0 ? repos.map((repo) => (
          <motion.div 
            key={repo.id} 
            whileHover={{ y: -4 }}
            className="notte-card p-6 space-y-4 group cursor-pointer"
            onClick={() => navigate(`/builder?id=${repo.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 bg-zinc-50 rounded-lg group-hover:bg-[#76F1BC]/10 transition-colors">
                <Github className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
              </div>
              <Activity className="w-4 h-4 text-[#76F1BC] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 truncate">{repo.name}</h3>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">{repo.owner}</p>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              <span>{repo.files} Files</span>
              <span>{(repo.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center notte-card bg-zinc-50/50 border-dashed">
            <DbIcon className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-zinc-400">Index is empty. Start by ingesting a repository.</p>
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
    <div className="space-y-8 animate-in">
      <SEO title="Compute Access" description="Manage your protocol API keys." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Access Control</h1>
          <p className="text-xs text-zinc-500 font-medium">Secure identifiers for external LLM ingestion.</p>
        </div>
        <button 
          onClick={() => setShowNew(true)}
          className="notte-card px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
        >
          <Plus className="w-3 h-3 text-[#76F1BC]" /> Generate Key
        </button>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="notte-card p-6 bg-zinc-50 border-zinc-200">
          <form onSubmit={handleCreateKey} className="flex gap-4">
            <input 
              type="text" 
              placeholder="Key description (e.g., GPT-4 Integration)" 
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-white border border-zinc-200 rounded-lg px-4 text-xs font-bold outline-none focus:border-zinc-900 transition-all"
            />
            <button type="submit" className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Create</button>
            <button type="button" onClick={() => setShowNew(false)} className="text-zinc-400 hover:text-zinc-600 px-2"><LogOut className="w-4 h-4 rotate-180" /></button>
          </form>
        </motion.div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-50 animate-pulse" />)}
          </div>
        ) : keys.length > 0 ? keys.map((key) => (
          <div key={key.id} className="notte-card p-6 flex items-center justify-between group hover:border-zinc-300 transition-all">
            <div className="space-y-1">
              <h3 className="font-bold text-zinc-900 text-sm">{key.name || 'Untitled Agent Key'}</h3>
              <div className="flex items-center gap-3">
                <code className="text-[10px] text-zinc-400 font-mono tracking-tight bg-zinc-50 px-2 py-1 rounded">
                  {key.key.substring(0, 12)}••••••••••••••••
                </code>
                <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => copyToClipboard(key.key, key.id)}
                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all"
              >
                {copyStatus === key.id ? <Check className="w-4 h-4 text-[#76F1BC]" /> : <Copy className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => deleteKey(key.id)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )) : (
          <div className="py-20 text-center notte-card bg-zinc-50/50 border-dashed">
            <Key className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-zinc-400">No active keys. Create one to begin external integration.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { profile, logout } = useAuth();
  return (
    <div className="space-y-8 animate-in max-w-2xl">
      <SEO title="System Settings" description="Protocol configuration and user identity." />
      <div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Identity Profile</h1>
        <p className="text-xs text-zinc-500 font-medium">Your active protocol credentials and environment status.</p>
      </div>

      <div className="notte-card p-10 space-y-10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-[#76F1BC]/10 rounded-2xl flex items-center justify-center border border-[#76F1BC]/20 overflow-hidden">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Terminal className="w-8 h-8 text-[#76F1BC]" />
            )}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-zinc-900">{profile?.name || 'Anonymous User'}</h2>
            <p className="text-xs text-zinc-400 font-bold">{profile?.email || 'N/A'}</p>
            <div className="flex items-center gap-2 mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#76F1BC] bg-[#76F1BC]/5 px-3 py-1 rounded-full w-fit">
              <ShieldCheck className="w-3 h-3" /> Protocol Verified
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-zinc-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Environment</p>
            <p className="text-xs font-bold text-zinc-900">Repodata Production Node v3.5.0</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-50 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Terminate Session <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="border-t border-zinc-100 py-20 bg-white">
    <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-2 space-y-6">
        <Link to="/" className="flex items-center gap-2 text-decoration-none group">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-[#76F1BC]">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="font-black text-lg tracking-tighter text-zinc-900">REPODATA</span>
        </Link>
        <p className="text-sm text-zinc-500 font-medium max-w-sm">
          High-fidelity ingestion protocol for the next generation of agentic coding workflows.
        </p>
      </div>
      <div>
         <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Protocol</h4>
         <ul className="space-y-4">
           <li><Link to="/about" className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors text-decoration-none">Documentation</Link></li>
           <li><Link to="/builder" className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors text-decoration-none">Console</Link></li>
           <li><Link to="/database" className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors text-decoration-none">Library</Link></li>
         </ul>
      </div>
      <div>
         <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Connect</h4>
         <ul className="space-y-4">
           <li><a href="https://github.com" target="_blank" className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors text-decoration-none">GitHub</a></li>
           <li><Link to="/about" className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors text-decoration-none">Terms</Link></li>
           <li><Link to="/about" className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors text-decoration-none">Privacy</Link></li>
         </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-20 pt-8 border-t border-zinc-50 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-300">
       <span>© 2026 Repodata Protocol</span>
       <span className="flex items-center gap-2 shadow-sm px-2 py-1 rounded bg-zinc-50 border border-zinc-100">
         <span className="w-1.5 h-1.5 rounded-full bg-[#76F1BC] animate-pulse" /> Node ACTIVE 
       </span>
    </div>
  </footer>
);

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isConsole = location.pathname.startsWith('/builder') || 
                    location.pathname.startsWith('/database') || 
                    location.pathname.startsWith('/keys') || 
                    location.pathname.startsWith('/settings');

  const navItems = [
    { label: 'Workbench', path: '/builder', icon: Terminal },
    { label: 'Library', path: '/database', icon: DbIcon },
    { label: 'API Keys', path: '/keys', icon: Key },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  if (!isConsole) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
          <Link to="/" className="flex items-center gap-2 text-decoration-none group">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-[#76F1BC] group-hover:rotate-12 transition-transform">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="font-black text-lg tracking-tighter text-zinc-900">REPODATA</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors text-decoration-none">About</Link>
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors text-decoration-none">Login</Link>
            <Link to="/builder" className="bg-black text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all text-decoration-none shadow-sm">Enter Console</Link>
          </div>
        </nav>
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
    <div className="min-h-screen bg-[#FDFDFD] flex">
      {/* Dynamic Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 280 }}
        className="h-screen sticky top-0 border-r border-zinc-200 bg-white flex flex-col z-40"
      >
        <div className="p-6 flex items-center justify-between border-b border-zinc-100">
          {!isSidebarCollapsed && (
            <Link to="/" className="flex items-center gap-2 text-decoration-none group">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-[#76F1BC]">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="font-black tracking-tighter text-zinc-900">REPODATA</span>
            </Link>
          )}
          {isSidebarCollapsed && (
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-[#76F1BC] mx-auto">
              <Terminal className="w-4 h-4" />
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-20 w-6 h-6 bg-white border border-zinc-200 rounded-lg flex items-center justify-center hover:bg-zinc-50 transition-colors shadow-sm"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3 h-3 text-zinc-400" /> : <ChevronLeft className="w-3 h-3 text-zinc-400" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group text-decoration-none ${
                location.pathname === item.path 
                  ? 'bg-zinc-100 text-zinc-900 border border-zinc-200/50' 
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-[#76F1BC]' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
              {!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100 text-center">
          {!isSidebarCollapsed ? (
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#76F1BC]">
                <Globe className="w-3 h-3" /> Node v3.5
              </div>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#76F1BC] w-3/4 h-full" />
              </div>
            </div>
          ) : (
             <div className="w-2 h-2 rounded-full bg-[#76F1BC] mx-auto animate-pulse" />
          )}
        </div>
      </motion.aside>

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto max-w-[1400px]">
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
