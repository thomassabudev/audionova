import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

const AccountSettingsView = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [email, setEmail] = useState(settings.email);

  const handleSave = () => {
    updateSettings({ displayName, email });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal information and profile picture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white font-medium text-xl">
                    {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <Button 
                size="sm" 
                className="absolute -bottom-2 -right-2 rounded-full w-6 h-6 p-0"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                +
              </Button>
              <Label htmlFor="avatar-upload" className="sr-only">Upload profile picture</Label>
              <input 
                id="avatar-upload" 
                type="file" 
                className="hidden" 
                accept="image/*"
                title="Upload profile picture"
                onChange={(e) => {
                  // Handle avatar upload
                  console.log('Avatar upload triggered');
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-sm text-muted-foreground">JPG, GIF or PNG. Max size of 2MB</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input 
              id="displayName" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              readOnly
            />
            <p className="text-sm text-muted-foreground">To change your email, use the verification process</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your security settings and connected accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add extra security to your account</p>
            </div>
            <Switch 
              checked={settings.twoFactorEnabled} 
              onCheckedChange={(checked) => updateSettings({ twoFactorEnabled: checked })} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">Update your password regularly</p>
            </div>
            <Button variant="outline">Change</Button>
          </div>
          
          <div className="space-y-2">
            <p className="font-medium">Connected Accounts</p>
            <div className="flex space-x-2">
              <Button variant="outline" disabled>Google</Button>
              <Button variant="outline" disabled>Facebook</Button>
              <Button variant="outline" disabled>Apple</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};

export default AccountSettingsView;