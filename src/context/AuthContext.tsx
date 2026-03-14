import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser,
  getIdToken,
  GithubAuthProvider,
  setPersistence,
  browserLocalPersistence,
  updateProfile
} from 'firebase/auth';
import { auth, isMockAuth } from '../services/firebase';

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  uid: string;
  githubToken?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const bootProtocol = async () => {
      console.log("%c💎 [SESSION_MANAGER] Activating Protocol v1 (Beta) [SYNCHRO_UPDATE]", "color: #00FFFF; font-weight: bold; font-size: 14px;");

      if (isMockAuth) {
        const localUid = localStorage.getItem('local_uid') || `local_user_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem('local_uid', localUid);
        if (mounted) {
          setProfile({
            uid: localUid,
            name: 'Local Developer',
            email: 'dev@local.host',
            avatar: '',
            githubToken: localStorage.getItem('rp_github_token') || undefined
          });
          setUser({ uid: localUid, email: 'dev@local.host', displayName: 'Local Developer', providerData: [{}] } as any);
          setIsInitializing(false);
        }
        return;
      }

      if (auth) {
        try {
          await setPersistence(auth, browserLocalPersistence);
          const result = await getRedirectResult(auth);
          if (result && mounted) {
            console.log("✅ [SESSION_MANAGER] Redirect resolved:", result.user.email);
            const credential = GithubAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
              localStorage.setItem('rp_github_token', credential.accessToken);
            }
          }
        } catch (err: any) {
          console.warn("[SESSION_MANAGER] Boot Intercept:", err.message);
        }
      }
    };

    bootProtocol();

    let unsubscribe = () => {};
    if (!isMockAuth && auth) {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (!mounted) return;
        
        console.log("%c[SESSION_MANAGER] Profile Sync -> " + (currentUser ? `ACTIVE (${currentUser.email})` : "EMPTY"), "color: #FF00FF;");
        
        if (currentUser) {
          const providerInfo = currentUser.providerData[0];
          setProfile({
            uid: currentUser.uid,
            name: currentUser.displayName || providerInfo?.displayName || 'Developer',
            email: currentUser.email || providerInfo?.email || '',
            avatar: currentUser.photoURL || providerInfo?.photoURL || undefined,
            githubToken: localStorage.getItem('rp_github_token') || undefined
          });
        } else {
          setProfile(null);
        }
        
        setUser(currentUser);
        setIsInitializing(false);
      });
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (isMockAuth) return;
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      console.log("🛠️ [SESSION_MANAGER] Protocol Google: POPUP");
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/popup-blocked') {
        console.info("🛠️ [SESSION_MANAGER] Identity blocked. Protocol fallback: REDIRECT");
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  }, []);

  const loginWithGithub = useCallback(async () => {
    if (isMockAuth) return;
    if (!auth) return;
    const provider = new GithubAuthProvider();
    provider.addScope('repo'); 
    provider.addScope('user:email'); 
    provider.addScope('read:user');
    
    try {
      console.log("🛠️ [SESSION_MANAGER] Protocol GitHub: POPUP");
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/popup-blocked') {
        console.info("🛠️ [SESSION_MANAGER] Identity blocked. Protocol fallback: REDIRECT");
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('rp_github_token');
    if (isMockAuth) {
      localStorage.removeItem('local_uid');
      setUser(null);
      setProfile(null);
      return;
    }
    if (auth) await signOut(auth);
  }, []);

  const getToken = useCallback(async () => {
    if (isMockAuth) {
      const payload = { uid: profile?.uid || 'local', email: profile?.email || 'dev@local.host' };
      return `local.${btoa(JSON.stringify(payload))}.sig`;
    }
    if (!auth?.currentUser) return null;
    return await getIdToken(auth.currentUser);
  }, [profile]);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      isLoading: isInitializing,
      user, 
      profile,
      loginWithGoogle,
      loginWithGithub,
      logout,
      getToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
