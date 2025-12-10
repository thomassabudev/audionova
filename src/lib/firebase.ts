import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { FIREBASE_CONFIG } from '@/config/api';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, googleProvider };