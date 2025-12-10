import React from 'react';
import { useQuickActions } from '../context/QuickActionsContext';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const QuickActionsSettings: React.FC = () => {
  const { 
    isQuickActionsEnabled, 
    setIsQuickActionsEnabled,
    defaultPlaylistId,
    setDefaultPlaylistId
  } = useQuickActions();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Quick Actions</h3>
        <p className="text-sm text-muted-foreground">
          Customize your sidebar quick actions for faster music management.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="quick-actions-toggle">Enable Quick Actions</Label>
            <p className="text-sm text-muted-foreground">
              Show quick action buttons in the sidebar
            </p>
          </div>
          <Switch
            id="quick-actions-toggle"
            checked={isQuickActionsEnabled}
            onCheckedChange={setIsQuickActionsEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-playlist">Default Quick Playlist</Label>
          <p className="text-sm text-muted-foreground">
            Select the playlist that quick actions will use by default
          </p>
          <div className="flex gap-2">
            <Input
              id="default-playlist"
              value={defaultPlaylistId || ''}
              onChange={(e) => setDefaultPlaylistId(e.target.value || null)}
              placeholder="Enter playlist ID"
              className="max-w-xs"
            />
            <Button variant="outline">Select Playlist</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsSettings;