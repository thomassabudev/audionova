/**
 * Feature Flags Configuration
 * Centralized feature flag management
 */

interface FeatureFlags {
  home_shared_element_transition: boolean;
  home_card_micro_ux: boolean;
  // Add more feature flags here as needed
}

const defaultFlags: FeatureFlags = {
  home_shared_element_transition: false, // Default OFF for safety
  home_card_micro_ux: true, // Default ON for better UX
};

class FeatureFlagManager {
  private flags: FeatureFlags;

  constructor() {
    // Load from localStorage or remote config
    const stored = localStorage.getItem('featureFlags');
    this.flags = stored ? { ...defaultFlags, ...JSON.parse(stored) } : defaultFlags;
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] ?? false;
  }

  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
    localStorage.setItem('featureFlags', JSON.stringify(this.flags));
  }

  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }
}

export const featureFlags = new FeatureFlagManager();
export type { FeatureFlags };
