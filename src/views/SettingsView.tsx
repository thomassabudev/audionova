import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  User,
  Volume2,
  Palette,
  Info,
  ChevronRight,
  LogOut,
  Upload,
  Loader2
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';

const SettingsView = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Load profile picture from localStorage
  useEffect(() => {
    if (user) {
      const savedPicture = localStorage.getItem(`profilePicture_${user.uid}`);
      setProfilePicture(savedPicture || user.photoURL || null);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleProfilePictureUpload = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload a profile picture');
      return;
    }

    setUploadingPhoto(true);
    
    try {
      // Convert image to base64 data URL for local storage
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const photoURL = reader.result as string;
          
          // Save to localStorage immediately
          localStorage.setItem(`profilePicture_${user.uid}`, photoURL);
          
          // Update local state immediately for instant UI update
          setProfilePicture(photoURL);
          
          // Update Firebase Auth profile in background
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL });
          }
          
          // Dispatch custom event to update other components
          window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
            detail: { photoURL } 
          }));
          
          toast.success('Profile picture updated!');
        } catch (error) {
          console.error('Profile update failed:', error);
          toast.error('Failed to update profile picture');
        } finally {
          setUploadingPhoto(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read file');
        setUploadingPhoto(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      toast.error('Failed to upload profile picture. Please try again.');
      setUploadingPhoto(false);
    }
  };

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'playback', label: 'Playback', icon: Volume2 },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'about', label: 'About', icon: Info },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">Account</h2>
              
              <div className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-6 py-4 border-b border-border">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg">
                      {profilePicture ? (
                        <img 
                          src={profilePicture} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-white">
                          {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-2">Profile Picture</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {profilePicture ? 'Change your profile picture' : 'Add a profile picture'}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size (max 10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('Image must be less than 10MB');
                            e.target.value = ''; // Reset input
                            return;
                          }
                          // Validate file type
                          if (!file.type.startsWith('image/')) {
                            toast.error('Please select an image file');
                            e.target.value = ''; // Reset input
                            return;
                          }
                          handleProfilePictureUpload(file);
                          e.target.value = ''; // Reset input after upload
                        }
                      }}
                      className="hidden"
                      id="profile-picture-upload"
                      disabled={uploadingPhoto}
                    />
                    <label htmlFor="profile-picture-upload">
                      <Button variant="outline" size="sm" asChild disabled={uploadingPhoto}>
                        <span className="cursor-pointer flex items-center gap-2">
                          {uploadingPhoto ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Choose Photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email || 'Not logged in'}</p>
                  </div>
                </div>

                {/* Display Name */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium">Display Name</p>
                    <p className="text-sm text-muted-foreground">{user?.displayName || 'User'}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>

                {/* Log Out */}
                <div className="pt-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    className="w-full"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'playback':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">Playback</h2>
              
              <div className="space-y-6">
                {/* Audio Quality */}
                <div>
                  <label className="block text-sm font-medium mb-3">Audio Quality</label>
                  <select
                    value={settings.audioQuality}
                    onChange={(e) => updateSettings({ audioQuality: e.target.value })}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="low">Low (96 kbps)</option>
                    <option value="normal">Normal (160 kbps)</option>
                    <option value="high">High (320 kbps)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">Higher quality uses more data</p>
                </div>

                {/* Crossfade */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Crossfade</label>
                    <span className="text-sm text-muted-foreground">{settings.crossfade}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={settings.crossfade}
                    onChange={(e) => updateSettings({ crossfade: parseInt(e.target.value) })}
                    className="w-full accent-red-500"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Smooth transition between songs</p>
                </div>

                {/* Normalize Volume */}
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div>
                    <p className="font-medium">Normalize Volume</p>
                    <p className="text-sm text-muted-foreground">Set the same volume level for all songs</p>
                  </div>
                  <button
                    onClick={() => updateSettings({ normalizeVolume: !settings.normalizeVolume })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.normalizeVolume ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.normalizeVolume ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Gapless Playback */}
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div>
                    <p className="font-medium">Gapless Playback</p>
                    <p className="text-sm text-muted-foreground">Play songs without pauses</p>
                  </div>
                  <button
                    onClick={() => updateSettings({ gaplessPlayback: !settings.gaplessPlayback })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.gaplessPlayback ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.gaplessPlayback ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'display':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">Display</h2>
              
              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium mb-3">Theme</label>
                  <select
                    value={settings.themeMode}
                    onChange={(e) => updateSettings({ themeMode: e.target.value })}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                {/* Animations */}
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div>
                    <p className="font-medium">Animations</p>
                    <p className="text-sm text-muted-foreground">Enable smooth animations</p>
                  </div>
                  <button
                    onClick={() => updateSettings({ enableAnimations: !settings.enableAnimations })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.enableAnimations ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enableAnimations ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Waveform */}
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div>
                    <p className="font-medium">Audio Visualizer</p>
                    <p className="text-sm text-muted-foreground">Show waveform in player</p>
                  </div>
                  <button
                    onClick={() => updateSettings({ showWaveform: !settings.showWaveform })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showWaveform ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.showWaveform ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">About</h2>
              
              <div className="space-y-4">
                <div className="py-3 border-b border-border">
                  <p className="font-medium">Version</p>
                  <p className="text-sm text-muted-foreground">1.0.0</p>
                </div>

                <div className="py-3 border-b border-border">
                  <p className="font-medium">Platform</p>
                  <p className="text-sm text-muted-foreground">Web</p>
                </div>

                <div className="py-3">
                  <Button variant="outline" className="w-full" onClick={() => window.open('https://github.com', '_blank')}>
                    View on GitHub
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                      activeSection === section.id
                        ? 'bg-red-500 text-white'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{section.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-card border border-border rounded-lg p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
