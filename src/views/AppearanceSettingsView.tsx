import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { deepEqual } from '@/lib/utils';

const AppearanceSettingsView: React.FC = () => {
  const { previewSettings, savedSettings, setPreviewSetting, savePreviewSettings, resetPreviewToSaved } = useTheme();
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);

  // Check if settings have been modified
  useEffect(() => {
    setIsDirty(!deepEqual(previewSettings, savedSettings));
  }, [previewSettings, savedSettings]);

  const handleSave = () => {
    savePreviewSettings();
    toast({
      title: "Settings saved",
      description: "Your appearance settings have been saved successfully.",
    });
  };

  const handleReset = () => {
    resetPreviewToSaved();
    toast({
      title: "Settings reset",
      description: "Preview reverted to saved settings.",
    });
  };

  // Predefined accent colors
  const accentColors = [
    { name: 'Red', value: '#ff5b5b' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#6366f1' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Appearance</h2>
        <p className="text-muted-foreground">Customize the look and feel of the application</p>
      </div>

      <div className="space-y-8">
        {/* Theme Mode */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Theme</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme Mode</Label>
              <p className="text-sm text-muted-foreground">Choose between light, dark, or system theme</p>
            </div>
            <Select 
              value={previewSettings.themeMode} 
              onValueChange={(value) => setPreviewSetting('themeMode', value as 'light' | 'dark' | 'system')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Accent Color</h3>
          <div className="flex flex-wrap gap-2">
            {accentColors.map((color) => (
              <button
                key={color.value}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  previewSettings.accentColor === color.value 
                    ? 'border-foreground ring-2 ring-offset-2 ring-ring' 
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color.value }}
                onClick={() => setPreviewSetting('accentColor', color.value)}
                aria-label={`Select ${color.name} accent color`}
              />
            ))}
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-color">Custom:</Label>
              <input
                id="custom-color"
                type="color"
                value={previewSettings.accentColor}
                onChange={(e) => setPreviewSetting('accentColor', e.target.value)}
                className="w-8 h-8 rounded-full border cursor-pointer"
                aria-label="Select custom accent color"
              />
            </div>
          </div>
        </div>

        {/* Visual Effects */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Visual Effects</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Background Blur</Label>
                <p className="text-sm text-muted-foreground">Apply blur effect to backgrounds</p>
              </div>
              <Switch
                checked={previewSettings.backgroundBlur}
                onCheckedChange={(checked) => setPreviewSetting('backgroundBlur', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Album Art Background</Label>
                <p className="text-sm text-muted-foreground">Use album art as background</p>
              </div>
              <Switch
                checked={previewSettings.albumArtBackground}
                onCheckedChange={(checked) => setPreviewSetting('albumArtBackground', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Dynamic Gradients</Label>
                <p className="text-sm text-muted-foreground">Enable dynamic color gradients</p>
              </div>
              <Switch
                checked={previewSettings.dynamicGradients}
                onCheckedChange={(checked) => setPreviewSetting('dynamicGradients', checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t">
        <Button 
          onClick={handleSave} 
          disabled={!isDirty}
        >
          Save Changes
        </Button>
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={!isDirty}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default AppearanceSettingsView;
