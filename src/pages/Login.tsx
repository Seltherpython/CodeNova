import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Github, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import SEO from '../components/SEO';

export default function Login() {
  const { loginWithGoogle, loginWithGithub, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname || '/builder') + (location.state?.from?.search || '');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, loading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <SEO title="Secure Login | Repo Trace - Access Your Code Analysis Portal" description="Sign in to Repo Trace to manage your GitHub repositories and access advanced code reasoning tools. Securely connect using your Google or GitHub account." />
        <Loader2 className="w-8 h-8 animate-spin text-[#76F1BC]" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Signing in...</p>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      setError('Sign in failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading || isLoading) return;
    setLoading(true);
    setError('');
    
    try {
      await loginWithGoogle();
      setLoading(false);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Identity Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Connection lost: Ensure the identity window stays open until finished.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Security Block: Please allow popups for this domain.');
      } else {
        setError(`Connection failed: ${err.message}`);
      }
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    if (loading || isLoading) return;
    setLoading(true);
    setError('');
    
    try {
      await loginWithGithub();
      setLoading(false);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Github Login Error:", err);
      setError(`GitHub Identity rejection: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative isolate">
      <SEO title="Secure Login | Repo Trace - Access Your Code Analysis Portal" description="Sign in to Repo Trace to manage your GitHub repositories and access advanced code reasoning tools. Securely connect using your Google or GitHub account." />
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#76F1BC]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
        >
          {/* Header */}
          <div className="text-center mb-10 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#76F1BC] rounded-xl flex items-center justify-center text-black">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="font-black text-lg tracking-tighter text-white uppercase italic">Repo Trace</span>
            </Link>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase italic">Sign In</h1>
              <p className="text-zinc-500 text-xs sm:text-sm font-medium">Access your projects.</p>
            </div>
          </div>

          <div className="notte-card p-5 sm:p-10 space-y-8 bg-black/60 border-white/10">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}

            {/* Social Auth */}
            <div className="space-y-3">
              <button
                onClick={handleGithubLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 active:scale-98"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                Sign in with Github
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 bg-[#76F1BC]/10 hover:bg-[#76F1BC]/20 text-[#76F1BC] border border-[#76F1BC]/20 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 active:scale-98"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Sign in with Google
              </button>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/5" />
              <span className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700">or email</span>
              <div className="flex-grow border-t border-white/5" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:border-[#76F1BC] outline-none text-sm font-bold transition-all text-white placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:border-[#76F1BC] outline-none text-sm font-bold transition-all text-white placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#76F1BC] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-lg active:scale-98"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : (
                  <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center mt-8 text-[10px] font-black text-zinc-700 uppercase tracking-widest">
            Open Source · Free Forever · No Payment Required
          </p>
        </motion.div>
      </div>
    </div>
  );
}
