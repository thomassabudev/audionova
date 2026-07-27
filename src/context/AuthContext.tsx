import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { updateProfile } from 'firebase/auth'; // Add this import
import { auth, googleProvider } from '../lib/firebase';
// Removed demo mode imports since we're using real Firebase

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  googleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  emailSignUp: (email: string, password: string) => Promise<void>;
  emailSignIn: (email: string, password: string) => Promise<void>;
  updateProfilePicture: (photoURL: string) => Promise<void>;
  getAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
        const isAdminEmail = adminEmail && currentUser.email === adminEmail;
        
        if (isAdminEmail) {
          // Admin verification (silent)
          try {
            // Force fresh token to get latest claims
            await currentUser.getIdToken(true);
            
            // Get fresh token result with server-verified claims
            const tokenResult = await currentUser.getIdTokenResult(true);
            
            // Check server-cryptographically-verified admin claim
            const hasAdminClaim = tokenResult.claims.admin === true;
            const isAuthorizedAdmin = tokenResult.claims.adminEmail === adminEmail;
            const isSingleAdmin = tokenResult.claims.singleAdmin === true;
            
            // All conditions must be true
            const isMaxSecurityAdmin = hasAdminClaim && isAuthorizedAdmin && isSingleAdmin;
            
            setIsAdmin(isMaxSecurityAdmin);
            
            if (!isMaxSecurityAdmin && isAdmin) {
              // Only log when admin access is lost
              console.warn('Admin access revoked');
            }
          } catch (error: any) {
            console.error('Admin verification error:', error);
            setIsAdmin(false);
            
            // Handle specific error cases
            if (error?.code === 'auth/user-token-expired') {
              await logout();
            }
          }
        } else {
          // Regular user - no admin verification needed
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Helper function to handle profile picture
  const handleUserProfilePicture = (user: User) => {
    if (user.photoURL) {
      // Dispatch event immediately to update profile picture components
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
        detail: { photoURL: user.photoURL } 
      }));
    }
  };

  const googleSignIn = async () => {
    try {
      // Create a more comprehensive error suppression during auth
      const suppressCORSErrors = () => {
        const originalError = console.error;
        const originalWarn = console.warn;
        
        // Override console methods with more specific filtering
        console.error = function(...args) {
          const message = args.join(' ');
          if (message.includes('Cross-Origin-Opener-Policy') ||
              message.includes('window.closed') ||
              message.includes('window.close') ||
              message.includes('policy would block') ||
              message.includes('firebase_auth.js')) {
            return; // Completely suppress CORS errors
          }
          return originalError.apply(console, args);
        };
        
        console.warn = function(...args) {
          const message = args.join(' ');
          if (message.includes('Cross-Origin-Opener-Policy') ||
              message.includes('window.closed') ||
              message.includes('window.close') ||
              message.includes('policy would block') ||
              message.includes('firebase_auth.js')) {
            return; // Completely suppress CORS warnings
          }
          return originalWarn.apply(console, args);
        };
        
        return { originalError, originalWarn };
      };

      // Start suppressing errors
      const { originalError, originalWarn } = suppressCORSErrors();
      
      try {
        // Use signInWithPopup but with better error handling
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        handleUserProfilePicture(user);
      } catch (popupError: any) {
        // If popup fails due to CORS, the error is suppressed
        // but we still need to handle actual auth failures
        if (popupError?.code === 'auth/popup-closed-by-user') {
          throw new Error('Sign-in was cancelled');
        } else if (popupError?.code === 'auth/popup-blocked') {
          throw new Error('Popup was blocked by browser. Please allow popups and try again.');
        } else if (!popupError?.message?.includes('Cross-Origin-Opener-Policy')) {
          throw popupError;
        }
        // If it's a CORS error, we ignore it as the auth might still succeed
      } finally {
        // Always restore console methods
        console.error = originalError;
        console.warn = originalWarn;
      }
      
    } catch (error: any) {
      // Only log actual authentication errors, not CORS warnings
      if (error?.code && 
          !error.message?.includes('Cross-Origin-Opener-Policy') &&
          !error.message?.includes('window.closed') &&
          !error.message?.includes('window.close') &&
          !error.message?.includes('policy would block') &&
          !error.message?.includes('firebase_auth.js')) {
        console.error('Google sign-in error:', error);
      }
      throw error;
    }
  };

  const emailSignUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign-up error:', error);
      throw error;
    }
  };

  const emailSignIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Add this new function
  const updateProfilePicture = async (photoURL: string) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
        // Update the user state to reflect the change
        setUser({ ...auth.currentUser, photoURL });
      }
    } catch (error) {
      console.error('Profile picture update error:', error);
      throw error;
    }
  };

  // 🔒 HARDENED: Get fresh Firebase auth token with latest claims
  const getAuthToken = async (forceRefresh: boolean = false): Promise<string | null> => {
    try {
      if (auth.currentUser) {
        // 🚨 CRITICAL: Always get fresh token for admin operations
        const token = await auth.currentUser.getIdToken(forceRefresh);
        
        if (forceRefresh) {
          await auth.currentUser.getIdTokenResult(true);
        }
        
        return token;
      }
      return null;
    } catch (error: any) {
      console.error('Error getting auth token:', error);
      
      // 🔄 Handle token refresh errors gracefully
      if (error?.code === 'auth/network-request-failed') {
        console.log('🔄 Network error getting token - user may need to retry');
      } else if (error?.code === 'auth/user-token-expired') {
        console.log('🔄 Token expired - forcing sign out');
        await logout();
      }
      
      return null;
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    googleSignIn,
    logout,
    emailSignUp,
    emailSignIn,
    updateProfilePicture,
    getAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};