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
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).trim().replace(/\/$/, '');

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signupWithGoogle: () => Promise<void>;
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
    await registerBackendOwner(cred.user);
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
    const credential = await signInWithPopup(auth, provider);
    const isRegistered = await checkBackendOwnerExists(credential.user);
    if (!isRegistered) {
      await signOut(auth);
      throw Object.assign(new Error('Account is not registered. Please sign up with Google first.'), {
        code: 'auth/backend-user-not-found',
      });
    }
    // Set session start time
    try {
      sessionStorage.setItem(SESSION_START_TIME_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to set session start time', error);
    }
  };

  const signupWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await registerBackendOwner(credential.user);
    try {
      sessionStorage.setItem(SESSION_START_TIME_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to set session start time', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, resetPassword, loginWithGoogle, signupWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

async function getBearerHeader(user: User) {
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function checkBackendOwnerExists(user: User) {
  const response = await fetch(`${API_BASE}/dashboard/me`, {
    headers: await getBearerHeader(user),
  });
  if (response.ok) return true;
  if (response.status === 401 || response.status === 404) return false;
  throw new Error('Could not verify your AktiveHQ account. Please try again.');
}

async function registerBackendOwner(user: User) {
  const response = await fetch(`${API_BASE}/dashboard/me/register`, {
    method: 'POST',
    headers: await getBearerHeader(user),
  });
  if (!response.ok) {
    throw new Error('Could not register your account in AktiveHQ. Please try again.');
  }
}
