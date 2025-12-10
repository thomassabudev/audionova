import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, Heart, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileDropdownProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userId?: string; // Add userId prop for localStorage key
  onLogout?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  userName = 'Music Lover',
  userEmail = 'user@example.com',
  userAvatar,
  userId,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(userAvatar || null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load profile picture from localStorage
  useEffect(() => {
    const loadProfilePicture = () => {
      if (userId) {
        const savedPicture = localStorage.getItem(`profilePicture_${userId}`);
        if (savedPicture) {
          setProfilePicture(savedPicture);
        } else if (userAvatar) {
          setProfilePicture(userAvatar);
        }
      } else if (userAvatar) {
        setProfilePicture(userAvatar);
      }
    };
    
    loadProfilePicture();
  }, [userAvatar, userId]);

  // Listen for profile picture updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      setProfilePicture(event.detail.photoURL);
    };

    window.addEventListener('profilePictureUpdated', handleProfileUpdate as EventListener);
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const menuItems = [
    {
      icon: Heart,
      label: 'Liked Songs',
      onClick: () => {
        setIsOpen(false);
        navigate('/liked');
      }
    },
    {
      icon: Library,
      label: 'Your Library',
      onClick: () => {
        setIsOpen(false);
        navigate('/library');
      }
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        setIsOpen(false);
        navigate('/settings');
      }
    },
    {
      icon: LogOut,
      label: 'Log out',
      onClick: handleLogout,
      danger: true
    }
  ];

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button - Just Avatar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden hover:ring-2 hover:ring-white/30 transition-all duration-200 shadow-lg"
      >
        {profilePicture ? (
          <img src={profilePicture} alt={userName} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(userName)}</span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border overflow-hidden z-50"
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-red-500/10 to-purple-600/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                  {profilePicture ? (
                    <img src={profilePicture} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(userName)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      item.danger
                        ? 'text-red-500 hover:bg-red-500/10'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;
