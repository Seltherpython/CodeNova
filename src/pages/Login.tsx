import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function Login() {
  const { loginWithGoogle, loginWithGithub } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname || '/builder') + (location.state?.from?.search || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      setError('Verification failed. Protocol rejected credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError('Google Identity failed.');
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGithub();
    } catch (err: any) {
      console.error("Github Login Error:", err);
      setError('Github Identity failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 bg-zinc-50/50 animate-in">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md notte-card p-10 space-y-10 bg-white"
      >
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-[#76F1BC] mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Welcome Back</h1>
          <p className="text-zinc-500 text-xs font-medium px-8 ">Sign in to manage your repository datasets.</p>
        </div>

        {error && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 p-4 rounded-lg text-red-600 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg focus:border-zinc-900 outline-none text-sm font-bold transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-lg focus:border-zinc-900 outline-none text-sm font-bold transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#76F1BC]" /> : (
              <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#76F1BC]" /></>
            )}
          </button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
          <div className="relative flex justify-center text-[9px] uppercase font-black text-zinc-300 bg-white px-4 tracking-widest">
            Other ways to sign in
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={handleGithubLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 py-4 bg-zinc-900 text-[#76F1BC] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 shadow-lg"
          >
            <Github className="w-4 h-4" />
            Sign in with Github
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 py-4 border border-zinc-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </motion.div>
    </div>
  );
}
