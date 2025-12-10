import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Eye,
  Contrast,
  Palette,
  MousePointer,
  Volume2,
  Accessibility,
  HelpCircle,
  Keyboard,
  Mic,
  Scan
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const AccessibilitySettingsView = () => {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="space-y-6">
      {/* Visual Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Visual Accessibility
          </CardTitle>
          <CardDescription>Customize visual elements for better accessibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Text Size</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                <Button
                  variant={settings.textSize === 'small' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ textSize: 'small' })}
                  size="sm"
                >
                  Small
                </Button>
                <Button
                  variant={settings.textSize === 'medium' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ textSize: 'medium' })}
                  size="sm"
                >
                  Medium
                </Button>
                <Button
                  variant={settings.textSize === 'large' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ textSize: 'large' })}
                  size="sm"
                >
                  Large
                </Button>
                <Button
                  variant={settings.textSize === 'extra' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ textSize: 'extra' })}
                  size="sm"
                >
                  Extra Large
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">High Contrast Mode</Label>
                <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
              </div>
              <Switch 
                checked={settings.highContrast} 
                onCheckedChange={(checked) => updateSettings({ highContrast: checked })} 
              />
            </div>

            <div>
              <Label className="text-base font-medium">Color Blindness Filters</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <Button
                  variant={settings.colorBlindMode === 'none' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ colorBlindMode: 'none' })}
                  size="sm"
                >
                  None
                </Button>
                <Button
                  variant={settings.colorBlindMode === 'deuteranopia' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ colorBlindMode: 'deuteranopia' })}
                  size="sm"
                >
                  Deuteranopia
                </Button>
                <Button
                  variant={settings.colorBlindMode === 'protanopia' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ colorBlindMode: 'protanopia' })}
                  size="sm"
                >
                  Protanopia
                </Button>
                <Button
                  variant={settings.colorBlindMode === 'tritanopia' ? 'default' : 'outline'}
                  onClick={() => updateSettings({ colorBlindMode: 'tritanopia' })}
                  size="sm"
                >
                  Tritanopia
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Hide Motion</Label>
                <p className="text-sm text-muted-foreground">Reduce motion for users sensitive to animation</p>
              </div>
              <Switch 
                checked={settings.hideMotion} 
                onCheckedChange={(checked) => updateSettings({ hideMotion: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Always Show Focus</Label>
                <p className="text-sm text-muted-foreground">Keep focus outlines visible at all times</p>
              </div>
              <Switch 
                checked={settings.alwaysShowFocus} 
                onCheckedChange={(checked) => updateSettings({ alwaysShowFocus: checked })} 
              />
            </div>

            <div>
              <Label className="text-base font-medium">Cursor Size: {settings.cursorSize}px</Label>
              <Slider
                value={[settings.cursorSize]}
                onValueChange={([value]) => updateSettings({ cursorSize: value })}
                max={48}
                min={16}
                step={4}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>16px</span>
                <span>48px</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screen Reader & Keyboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Screen Reader & Keyboard
          </CardTitle>
          <CardDescription>Optimize for screen readers and keyboard navigation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Full ARIA Labeling</Label>
                <p className="text-sm text-muted-foreground">Enable comprehensive screen reader support</p>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Keyboard Shortcuts Help</Label>
                <p className="text-sm text-muted-foreground">Show keyboard shortcut overlay</p>
              </div>
              <Button variant="outline" size="sm">
                <HelpCircle className="w-4 h-4 mr-2" />
                View
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Optimized Tab Order</Label>
                <p className="text-sm text-muted-foreground">Ensure logical navigation sequence</p>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Skip to Content</Label>
                <p className="text-sm text-muted-foreground">Show skip navigation button</p>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Tooltip Text</Label>
                <p className="text-sm text-muted-foreground">Show descriptions for all icons</p>
              </div>
              <Switch defaultChecked disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Audio Accessibility
          </CardTitle>
          <CardDescription>Customize audio settings for accessibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Mono Audio</Label>
                <p className="text-sm text-muted-foreground">Combine left and right audio channels</p>
              </div>
              <Switch 
                checked={settings.monoAudio} 
                onCheckedChange={(checked) => updateSettings({ monoAudio: checked })} 
              />
            </div>

            <div>
              <Label className="text-base font-medium">Audio Balance: {settings.audioBalance === 0 ? 'Center' : settings.audioBalance > 0 ? `Right ${settings.audioBalance}%` : `Left ${Math.abs(settings.audioBalance)}%`}</Label>
              <Slider
                value={[settings.audioBalance]}
                onValueChange={([value]) => updateSettings({ audioBalance: value })}
                max={100}
                min={-100}
                step={10}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Left</span>
                <span>Center</span>
                <span>Right</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Show Subtitles</Label>
                <p className="text-sm text-muted-foreground">Display lyrics and captions</p>
              </div>
              <Switch 
                checked={settings.showSubtitles} 
                onCheckedChange={(checked) => updateSettings({ showSubtitles: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Disable Visualizer</Label>
                <p className="text-sm text-muted-foreground">Turn off visual effects for epilepsy</p>
              </div>
              <Switch 
                checked={settings.disableVisualizer} 
                onCheckedChange={(checked) => updateSettings({ disableVisualizer: checked })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UX Enhancements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="w-5 h-5" />
            UX Enhancements
          </CardTitle>
          <CardDescription>Additional accessibility improvements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Voice Navigation</Label>
                <p className="text-sm text-muted-foreground">Control app with voice commands</p>
              </div>
              <Switch 
                checked={settings.voiceNavigation} 
                onCheckedChange={(checked) => updateSettings({ voiceNavigation: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Magnifier Compatibility</Label>
                <p className="text-sm text-muted-foreground">Optimize for screen magnifiers</p>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Contextual Hints</Label>
                <p className="text-sm text-muted-foreground">Show accessibility tips for new users</p>
              </div>
              <Switch defaultChecked disabled />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessibilitySettingsView;