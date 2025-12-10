import React from 'react';
import { getLangCode, getLangBadgeColor } from '@/utils/languageUtils';

interface LanguageBadgeProps {
  language?: string | null;
  className?: string;
}

/**
 * Language badge component that displays a 2-letter language code
 * Automatically detects language from metadata and shows appropriate badge
 */
const LanguageBadge: React.FC<LanguageBadgeProps> = ({ language, className = '' }) => {
  const langCode = getLangCode(language);
  
  if (!langCode) return null;
  
  const colorClass = getLangBadgeColor(langCode);
  
  return (
    <div className={`absolute bottom-2 left-2 ${className}`}>
      <span
        className={`text-xs font-bold px-1.5 py-0.5 rounded ${colorClass} text-white shadow-sm`}
        aria-label={`Language: ${langCode}`}
      >
        {langCode}
      </span>
    </div>
  );
};

export default LanguageBadge;
