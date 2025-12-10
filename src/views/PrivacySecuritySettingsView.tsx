import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  Shield, 
  Key, 
  Lock, 
  Smartphone, 
  Mail, 
  Download, 
  Trash2, 
  Monitor,
  UserX,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const PrivacySecuritySettingsView = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState('');

  // Mock data for sessions and devices
  const [sessions] = useState([
    { id: 1, name: 'Chrome on Windows', browser: 'Chrome 120', time: '2 hours ago', current: true },
    { id: 2, name: 'Safari on iPhone', browser: 'Mobile Safari', time: '1 day ago', current: false },
    { id: 3, name: 'Firefox on Mac', browser: 'Firefox 121', time: '3 days ago', current: false },
  ]);

  const handleDeleteAccount = () => {
    // In a real app, this would delete the account
    console.log('Account deletion requested');
  };

  const handleUnblockUser = (userId: string) => {
    const updatedBlockedUsers = settings.blockedUsers.filter(id => id !== userId);
    updateSettings({ blockedUsers: updatedBlockedUsers });
  };

  const handleEndSession = (sessionId: number) => {
    // In a real app, this would end the session
    console.log('Session ended:', sessionId);
  };

  return (
    <div className="space-y-6">
      {/* User Data & Account Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            User Data & Account Control
          </CardTitle>
          <CardDescription>Manage your profile visibility and account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Profile Visibility</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <Button
                  variant={settings.profileVisibility === 'public' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ profileVisibility: 'public' })}
                  className="h-auto py-3 flex flex-col items-center gap-1"
                >
                  <Eye className="w-5 h-5" />
                  <span>Public</span>
                  <span className="text-xs font-normal">Everyone can see your profile</span>
                </Button>
                <Button
                  variant={settings.profileVisibility === 'friends' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ profileVisibility: 'friends' })}
                  className="h-auto py-3 flex flex-col items-center gap-1"
                >
                  <Shield className="w-5 h-5" />
                  <span>Friends Only</span>
                  <span className="text-xs font-normal">Only friends can see your profile</span>
                </Button>
                <Button
                  variant={settings.profileVisibility === 'private' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ profileVisibility: 'private' })}
                  className="h-auto py-3 flex flex-col items-center gap-1"
                >
                  <Lock className="w-5 h-5" />
                  <span>Private</span>
                  <span className="text-xs font-normal">Only you can see your profile</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Listening Activity</Label>
                <p className="text-sm text-muted-foreground">Share your listening history with followers</p>
              </div>
              <Switch 
                checked={settings.listeningActivity} 
                onCheckedChange={(checked) => updateSettings({ listeningActivity: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Follower Requests</Label>
                <p className="text-sm text-muted-foreground">How to handle new follower requests</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={settings.followerRequests === 'auto' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ followerRequests: 'auto' })}
                >
                  Auto-approve
                </Button>
                <Button
                  variant={settings.followerRequests === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ followerRequests: 'manual' })}
                >
                  Manual
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Blocked Users</Label>
              {settings.blockedUsers.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {settings.blockedUsers.map((userId) => (
                    <div key={userId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>User {userId}</span>
                      <Button variant="outline" size="sm" onClick={() => handleUnblockUser(userId)}>
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">You haven't blocked any users</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Data Protection
          </CardTitle>
          <CardDescription>Secure your account with additional protection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Add extra security to your account</p>
              </div>
              <Switch 
                checked={settings.twoFactorAuth} 
                onCheckedChange={(checked) => updateSettings({ twoFactorAuth: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Login Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when your account is accessed</p>
              </div>
              <Switch 
                checked={settings.loginAlerts} 
                onCheckedChange={(checked) => updateSettings({ loginAlerts: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Password Change</Label>
                <p className="text-sm text-muted-foreground">Update your account password</p>
              </div>
              <Button variant="outline">Change Password</Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Account Recovery</Label>
                <p className="text-sm text-muted-foreground">Manage recovery options</p>
              </div>
              <Button variant="outline">Manage</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active sessions across devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{session.name}</p>
                <p className="text-sm text-muted-foreground">{session.browser} • {session.time}</p>
              </div>
              <div className="flex items-center gap-2">
                {session.current && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Current</span>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEndSession(session.id)}
                  disabled={session.current}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Privacy & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data Privacy & Compliance
          </CardTitle>
          <CardDescription>Manage your data privacy and compliance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Download My Data</Label>
                <p className="text-sm text-muted-foreground">Export your data as per GDPR requirements</p>
              </div>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Request Data
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Allow anonymous usage analytics</p>
              </div>
              <Switch 
                checked={settings.dataSharing} 
                onCheckedChange={(checked) => updateSettings({ dataSharing: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Location Sharing</Label>
                <p className="text-sm text-muted-foreground">Allow region-based recommendations</p>
              </div>
              <Switch 
                checked={settings.locationSharing} 
                onCheckedChange={(checked) => updateSettings({ locationSharing: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Cookie Preferences</Label>
                <p className="text-sm text-muted-foreground">Manage your cookie consent</p>
              </div>
              <Button variant="outline">Manage</Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your account? This action cannot be undone. 
                    All your data will be permanently removed.
                  </AlertDialogDescription>
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="password">Confirm Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    className="bg-red-500 hover:bg-red-600"
                    disabled={!password}
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacySecuritySettingsView;