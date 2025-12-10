/**
 * Feature Flag Toggle Component
 * Developer tool for testing feature flags
 */

import React, { useState, useEffect } from 'react';
import { featureFlags } from '@/config/featureFlags';
import { motion } from 'framer-motion';

export default function FeatureFlagToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [flags, setFlags] = useState(featureFlags.getAllFlags());

  useEffect(() => {
    // Update local state when flags change
    const interval = setInterval(() => {
      setFlags(featureFlags.getAllFlags());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleFlag = (flag: keyof typeof flags) => {
    const newValue = !flags[flag];
    featureFlags.setFlag(flag, newValue);
    setFlags(featureFlags.getAllFlags());
  };

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🚩 Feature Flags
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg shadow-xl p-4 w-80"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Feature Flags</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {Object.entries(flags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <label htmlFor={key} className="text-sm font-medium cursor-pointer">
                  {key.replace(/_/g, ' ')}
                </label>
                <button
                  id={key}
                  onClick={() => toggleFlag(key as keyof typeof flags)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Changes are saved to localStorage
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
