import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Key, 
  Wifi, 
  Download, 
  Bell, 
  Shield, 
  Palette, 
  Accessibility, 
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import AccountSettingsView from './AccountSettingsView';
import PrivacySecuritySettingsView from './PrivacySecuritySettingsView';
import AppearanceSettingsView from './AppearanceSettingsView';
import AccessibilitySettingsView from './AccessibilitySettingsView';
import AboutView from './AboutView';

const SettingsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeSection, setActiveSection] = useState(() => {
    // Extract section from URL path
    if (location.pathname.includes('/settings/account')) return 'account';
    if (location.pathname.includes('/settings/privacy')) return 'privacy';
    if (location.pathname.includes('/settings/appearance')) return 'appearance';
    if (location.pathname.includes('/settings/accessibility')) return 'accessibility';
    if (location.pathname.includes('/settings/about')) return 'about';
    return 'account'; // default
  });

  const handleSave = () => {
    // Settings are automatically saved to localStorage via the context
    console.log('Settings saved');
    // In a real app, you would also save to backend API
    // Example: api.saveSettings(settings);
  };

  const handleReset = () => {
    resetSettings();
  };

  const sections = [
    { id: 'account', label: 'Account', icon: Key },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'playback', label: 'Playback', icon: Wifi },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'about', label: 'About', icon: Info },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettingsView />;
      case 'privacy':
        return <PrivacySecuritySettingsView />;
      case 'playback':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Playback Settings</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="audioQuality" className="block text-sm font-medium mb-2">Audio Quality</label>
                  <select
                    id="audioQuality"
                    value={settings.audioQuality}
                    onChange={(e) => updateSettings({ audioQuality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="lossless">Lossless</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="crossfade" className="block text-sm font-medium mb-2">Crossfade (seconds)</label>
                  <input
                    type="range"
                    id="crossfade"
                    min="0"
                    max="12"
                    value={settings.crossfade}
                    onChange={(e) => updateSettings({ crossfade: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>0s</span>
                    <span>{settings.crossfade}s</span>
                    <span>12s</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Gapless Playback</p>
                    <p className="text-sm text-gray-500">Play tracks without gaps</p>
                  </div>
                  <Button 
                    variant={settings.gaplessPlayback ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ gaplessPlayback: !settings.gaplessPlayback })}
                  >
                    {settings.gaplessPlayback ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Normalize Volume</p>
                    <p className="text-sm text-gray-500">Adjust volume levels across tracks</p>
                  </div>
                  <Button 
                    variant={settings.normalizeVolume ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ normalizeVolume: !settings.normalizeVolume })}
                  >
                    {settings.normalizeVolume ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'downloads':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Download Settings</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="downloadQuality" className="block text-sm font-medium mb-2">Download Quality</label>
                  <select
                    id="downloadQuality"
                    value={settings.downloadQuality}
                    onChange={(e) => updateSettings({ downloadQuality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-download Liked Songs</p>
                    <p className="text-sm text-gray-500">Automatically download songs you like</p>
                  </div>
                  <Button 
                    variant={settings.autoDownloadLiked ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ autoDownloadLiked: !settings.autoDownloadLiked })}
                  >
                    {settings.autoDownloadLiked ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-download Playlists</p>
                    <p className="text-sm text-gray-500">Automatically download new playlists</p>
                  </div>
                  <Button 
                    variant={settings.autoDownloadPlaylists ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ autoDownloadPlaylists: !settings.autoDownloadPlaylists })}
                  >
                    {settings.autoDownloadPlaylists ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-download Recommended</p>
                    <p className="text-sm text-gray-500">Automatically download recommended songs</p>
                  </div>
                  <Button 
                    variant={settings.autoDownloadRecommended ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ autoDownloadRecommended: !settings.autoDownloadRecommended })}
                  >
                    {settings.autoDownloadRecommended ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">Receive notifications on your device</p>
                  </div>
                  <Button 
                    variant={settings.pushNotifications ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ pushNotifications: !settings.pushNotifications })}
                  >
                    {settings.pushNotifications ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive emails about updates</p>
                  </div>
                  <Button 
                    variant={settings.emailNotifications ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ emailNotifications: !settings.emailNotifications })}
                  >
                    {settings.emailNotifications ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">In-App Notifications</p>
                    <p className="text-sm text-gray-500">Show notifications within the app</p>
                  </div>
                  <Button 
                    variant={settings.inAppNotifications ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSettings({ inAppNotifications: !settings.inAppNotifications })}
                  >
                    {settings.inAppNotifications ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'appearance':
        return <AppearanceSettingsView />;
      case 'accessibility':
        return <AccessibilitySettingsView />;
      case 'about':
        return <AboutView />;
      default:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">{sections.find(s => s.id === activeSection)?.label}</h3>
            <p className="text-gray-500">Settings for this section will be available soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-card border border-border rounded-lg p-4">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        // Navigate to the appropriate route
                        switch (section.id) {
                          case 'account':
                            navigate('/settings/account');
                            break;
                          case 'privacy':
                            navigate('/settings/privacy');
                            break;
                          case 'playback':
                            navigate('/settings/playback');
                            break;
                          case 'downloads':
                            navigate('/settings/downloads');
                            break;
                          case 'notifications':
                            navigate('/settings/notifications');
                            break;
                          case 'appearance':
                            navigate('/settings/appearance');
                            break;
                          case 'accessibility':
                            navigate('/settings/accessibility');
                            break;
                          case 'about':
                            navigate('/settings/about');
                            break;
                          default:
                            navigate('/settings');
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-red-500 text-white'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-card border border-border rounded-lg p-6">
              {renderSectionContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;