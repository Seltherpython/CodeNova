import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  getIdToken,
  signInWithRedirect,
  getRedirectResult,
  GithubAuthProvider
} from 'firebase/auth';
import { auth } from '../services/firebase';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Safety timeout to prevent infinite blank screen if Firebase is slow
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth handshake taking too long. Falling back to public context.");
        setIsLoading(false);
      }
    }, 2500);

    // Handle redirect result (catch errors from Google/Github redirect)
    getRedirectResult(auth).then((result) => {
      if (result) {
        // Extract Github Token if available
        const credential = GithubAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          localStorage.setItem('rp_github_token', credential.accessToken);
          setProfile(prev => prev ? { ...prev, githubToken: credential.accessToken } : null);
        }
      }
    }).catch((error) => {
      console.error("Auth Redirect Error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(safetyTimeout);
      setUser(currentUser);
      if (currentUser) {
        setProfile({
          uid: currentUser.uid,
          name: currentUser.displayName || 'Developer',
          email: currentUser.email || '',
          avatar: currentUser.photoURL || undefined,
          githubToken: localStorage.getItem('rp_github_token') || undefined
        });
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const loginWithGithub = useCallback(async () => {
    const provider = new GithubAuthProvider();
    provider.addScope('repo'); // Essential for scanning private or public repos with user limits
    await signInWithRedirect(auth, provider);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('rp_github_token');
    await signOut(auth);
  }, []);

  const getToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await getIdToken(auth.currentUser);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      isLoading,
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
