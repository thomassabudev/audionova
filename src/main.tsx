import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Simple error suppression at startup
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  const message = String(args[0] || '').toLowerCase();
  const fullMessage = args.join(' ').toLowerCase();
  
  if (message.includes('cross-origin-opener-policy') ||
      message.includes('window.closed') ||
      message.includes('firebase_auth.js') ||
      fullMessage.includes('cross-origin-opener-policy') ||
      fullMessage.includes('window.closed') ||
      fullMessage.includes('firebase_auth.js')) {
    return; // Suppress Firebase CORS errors
  }
  
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const message = String(args[0] || '').toLowerCase();
  const fullMessage = args.join(' ').toLowerCase();
  
  if (message.includes('cross-origin-opener-policy') ||
      message.includes('window.closed') ||
      message.includes('firebase_auth.js') ||
      fullMessage.includes('cross-origin-opener-policy') ||
      fullMessage.includes('window.closed') ||
      fullMessage.includes('firebase_auth.js')) {
    return; // Suppress Firebase CORS warnings
  }
  
  originalWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);