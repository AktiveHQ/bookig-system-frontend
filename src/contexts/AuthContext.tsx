import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const INACTIVITY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
const SESSION_START_TIME_KEY = 'akhq:sessionStartTime';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User logged in - set session start time
        try {
          const existingStartTime = sessionStorage.getItem(SESSION_START_TIME_KEY);
          if (!existingStartTime) {
            sessionStorage.setItem(SESSION_START_TIME_KEY, Date.now().toString());
          }
        } catch (error) {
          console.error('Failed to set session start time', error);
        }
      } else {
        // User logged out - clear session start time
        try {
          sessionStorage.removeItem(SESSION_START_TIME_KEY);
        } catch (error) {
          console.error('Failed to clear session start time', error);
        }
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Check for session expiration every 5 minutes
  useEffect(() => {
    if (!user) return;

    const checkSessionExpiration = () => {
      try {
        const sessionStartTime = sessionStorage.getItem(SESSION_START_TIME_KEY);
        if (!sessionStartTime) return;

        const elapsedTime = Date.now() - parseInt(sessionStartTime, 10);
        if (elapsedTime > SESSION_TIMEOUT_MS) {
          // Session expired - log out
          signOut(auth).catch(error => console.error('Logout error:', error));
          try {
            sessionStorage.removeItem(SESSION_START_TIME_KEY);
          } catch (error) {
            console.error('Failed to clear session start time', error);
          }
        }
      } catch (error) {
        console.error('Error checking session expiration', error);
      }
    };

    const interval = setInterval(checkSessionExpiration, INACTIVITY_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // Set session start time
    try {
      sessionStorage.setItem(SESSION_START_TIME_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to set session start time', error);
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    // Set session start time
    try {
      sessionStorage.setItem(SESSION_START_TIME_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to set session start time', error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    // Clear session start time
    try {
      sessionStorage.removeItem(SESSION_START_TIME_KEY);
    } catch (error) {
      console.error('Failed to clear session start time', error);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Set session start time
    try {
      sessionStorage.setItem(SESSION_START_TIME_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to set session start time', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, resetPassword, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};
