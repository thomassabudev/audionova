/**
 * Language utility functions for song metadata
 */

/**
 * Converts a language string to a standardized 2-letter code
 * @param lang - Raw language string from API (can be messy, mixed-case, multiple words)
 * @returns Uppercase 2-letter language code or null if not recognized
 * 
 * @example
 * getLangCode('Malayalam') // 'ML'
 * getLangCode('malayalam / India') // 'ML'
 * getLangCode('tamil - trending') // 'TA'
 * getLangCode('') // null
 */
export const getLangCode = (lang?: string | null): string | null => {
  if (!lang) return null;
  const s = String(lang).trim().toLowerCase();
  
  // Check for full language names or common abbreviations
  if (s.includes('malayalam') || s === 'ml') return 'ML';
  if (s.includes('tamil') || s === 'ta') return 'TA';
  if (s.includes('hindi') || s === 'hi') return 'HI';
  if (s.includes('english') || s.startsWith('eng') || s === 'en') return 'EN';
  if (s.includes('telugu') || s === 'te') return 'TE';
  if (s.includes('kannada') || s === 'kn') return 'KN';
  if (s.includes('bengali') || s === 'bn') return 'BN';
  if (s.includes('punjabi') || s === 'pa') return 'PA';
  if (s.includes('marathi') || s === 'mr') return 'MR';
  if (s.includes('gujarati') || s === 'gu') return 'GU';
  
  // Try to extract a 2-letter code from the string
  const two = s.match(/\b([a-z]{2})\b/);
  if (two) return two[1].toUpperCase();
  
  return null;
};

/**
 * Gets the Tailwind CSS color class for a language code
 * @param langCode - 2-letter language code
 * @returns Tailwind background color class
 */
export const getLangBadgeColor = (langCode: string): string => {
  switch (langCode) {
    case 'ML':
      return 'bg-green-500';
    case 'TA':
      return 'bg-purple-500';
    case 'HI':
      return 'bg-orange-500';
    case 'EN':
      return 'bg-gray-700';
    case 'TE':
      return 'bg-blue-500';
    case 'KN':
      return 'bg-red-500';
    case 'BN':
      return 'bg-yellow-600';
    case 'PA':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
};
