import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface AppBootstrapProps {
  children: React.ReactNode;
}

export default function AppBootstrap({ children }: AppBootstrapProps) {
  const { loading: authLoading } = useAuth();
  
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const hasSeenLoader = localStorage.getItem('audioNova.loaderSeen');
    const isFirst = !hasSeenLoader;
    
    if (isFirst) {
      localStorage.setItem('audioNova.loaderSeen', 'true');
    }
    
    // First visit: Min 4000ms
    // Return visit: Min 1200ms
    const minDelay = isFirst ? 4000 : 1200;
    
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDelay);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only dismiss the static splash if BOTH conditions are met:
    if (minTimeElapsed && !authLoading) {
      const splashScreen = document.getElementById('splash-screen');
      if (splashScreen) {
        // Initiate the CSS fade-out transition
        splashScreen.classList.add('fade-out');
        
        // Remove from DOM once transition completes
        const handleTransitionEnd = (e: TransitionEvent) => {
          if (e.propertyName === 'opacity') {
            splashScreen.remove();
            splashScreen.removeEventListener('transitionend', handleTransitionEnd);
          }
        };
        
        splashScreen.addEventListener('transitionend', handleTransitionEnd);
        
        // Fallback cleanup in case transitionend fails to fire (e.g., background tab)
        setTimeout(() => {
          if (document.body.contains(splashScreen)) {
            splashScreen.remove();
          }
        }, 1000);
      }
    }
  }, [minTimeElapsed, authLoading]);

  // We mount the children immediately so they can hydrate while the splash is visible
  return <>{children}</>;
}
