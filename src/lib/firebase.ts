import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { FIREBASE_CONFIG } from '@/config/api';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);

// Initialize Firebase Authentication and get a reference to the service
const auth: Auth = getAuth(app);

// Google Auth Provider with popup-optimized configuration
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Add popup-specific parameters
  display: 'popup',
  access_type: 'online'
});

// Request only essential scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');

export { auth, googleProvider };