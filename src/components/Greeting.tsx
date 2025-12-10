import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function timeOfDayLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}

function emojiFor(label: string) {
  return { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' }[label] || '';
}

export default function Greeting() {
  const { user } = useAuth();
  const [label, setLabel] = useState(timeOfDayLabel());
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    // Update every 15 minutes if app stays open
    const t = setInterval(() => setLabel(timeOfDayLabel()), 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Load profile picture from localStorage or Firebase
    if (user) {
      const savedPicture = localStorage.getItem(`profilePicture_${user.uid}`);
      setProfilePicture(savedPicture || user.photoURL || null);
    }
  }, [user]);

  useEffect(() => {
    // Listen for profile picture updates
    const handleProfileUpdate = (event: CustomEvent) => {
      setProfilePicture(event.detail.photoURL);
    };

    window.addEventListener('profilePictureUpdated', handleProfileUpdate as EventListener);
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  // Use displayName or email as fallback
  const name = user?.displayName || user?.email?.split('@')[0] || null;
  
  return (
    <header role="banner" aria-live="polite" className="greeting flex items-center gap-4">
      {/* Profile Picture */}
      {user && (
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          {profilePicture ? (
            <img 
              src={profilePicture} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-white">
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
        </div>
      )}
      
      <h1 className="text-xl font-bold text-foreground truncate">
        {`Good ${label}${name ? `, ${name}` : ''} ${emojiFor(label)}`}
      </h1>
    </header>
  );
}