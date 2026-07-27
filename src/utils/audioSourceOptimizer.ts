/**
 * 🎵 AUDIO SOURCE OPTIMIZER
 * 
 * Legitimately selects the highest quality audio stream available
 * from JioSaavn API without fake upscaling or misleading users.
 */

export interface AudioQuality {
  url: string;
  bitrate?: number;
  format?: string;
  quality: 'low' | 'medium' | 'high' | 'unknown';
}

export interface AudioSourceInfo {
  selectedUrl: string;
  detectedQuality: AudioQuality['quality'];
  detectedBitrate?: number;
  detectedFormat?: string;
  availableQualities: AudioQuality[];
}

/**
 * Analyzes JioSaavn downloadUrl array and selects the highest quality stream
 */
export function selectOptimalAudioSource(downloadUrls: any[], preferredQuality: string = 'high'): AudioSourceInfo {
  if (!Array.isArray(downloadUrls) || downloadUrls.length === 0) {
    return {
      selectedUrl: '',
      detectedQuality: 'unknown',
      availableQualities: []
    };
  }

  const audioQualities: AudioQuality[] = downloadUrls
    .filter(item => item && item.link && item.link.trim() !== '')
    .map(item => {
      const url = item.link;
      const quality = item.quality || 'unknown';
      
      // Parse quality indicators from JioSaavn API
      let detectedQuality: AudioQuality['quality'] = 'unknown';
      let estimatedBitrate: number | undefined;
      
      if (typeof quality === 'string') {
        const qualityLower = quality.toLowerCase();
        
        // Enhanced JioSaavn quality mapping
        if (qualityLower.includes('320') || qualityLower === '320kbps' || qualityLower === 'high') {
          detectedQuality = 'high';
          estimatedBitrate = 320;
        } else if (qualityLower.includes('256') || qualityLower === '256kbps') {
          detectedQuality = 'high';
          estimatedBitrate = 256;
        } else if (qualityLower.includes('160') || qualityLower === '160kbps' || qualityLower === 'medium' || qualityLower === 'normal') {
          detectedQuality = 'medium';
          estimatedBitrate = 160;
        } else if (qualityLower.includes('128') || qualityLower === '128kbps') {
          detectedQuality = 'medium';
          estimatedBitrate = 128;
        } else if (qualityLower.includes('96') || qualityLower === '96kbps' || qualityLower === 'low') {
          detectedQuality = 'low';
          estimatedBitrate = 96;
        } else if (qualityLower.includes('64') || qualityLower === '64kbps') {
          detectedQuality = 'low';
          estimatedBitrate = 64;
        }
      }
      
      // Also try to detect quality from URL patterns
      if (detectedQuality === 'unknown' && url) {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('_320.') || urlLower.includes('320kbps')) {
          detectedQuality = 'high';
          estimatedBitrate = 320;
        } else if (urlLower.includes('_256.') || urlLower.includes('256kbps')) {
          detectedQuality = 'high';
          estimatedBitrate = 256;
        } else if (urlLower.includes('_160.') || urlLower.includes('160kbps')) {
          detectedQuality = 'medium';
          estimatedBitrate = 160;
        } else if (urlLower.includes('_128.') || urlLower.includes('128kbps')) {
          detectedQuality = 'medium';
          estimatedBitrate = 128;
        } else if (urlLower.includes('_96.') || urlLower.includes('96kbps')) {
          detectedQuality = 'low';
          estimatedBitrate = 96;
        }
      }
      
      let format = 'mp3';
      if (url.includes('.m4a') || url.includes('aac')) {
        format = 'aac';
      } else if (url.includes('.opus')) {
        format = 'opus';
      } else if (url.includes('.mp4')) {
        format = 'mp4';
      }
      
      return {
        url,
        bitrate: estimatedBitrate,
        format,
        quality: detectedQuality
      };
    });

  // Map user preferred quality ('low' | 'normal' | 'high') to target quality
  const targetQualityMap: Record<string, AudioQuality['quality']> = {
    low: 'low',
    normal: 'medium',
    medium: 'medium',
    high: 'high'
  };

  const targetQuality = targetQualityMap[preferredQuality.toLowerCase()] || 'high';

  // Find exact quality match or closest available bitrate
  const exactMatch = audioQualities.find(q => q.quality === targetQuality);
  const selectedAudio = exactMatch || [...audioQualities].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

  if (!selectedAudio) {
    return {
      selectedUrl: '',
      detectedQuality: 'unknown',
      availableQualities: []
    };
  }
  
  return {
    selectedUrl: selectedAudio.url,
    detectedQuality: selectedAudio.quality,
    detectedBitrate: selectedAudio.bitrate,
    detectedFormat: selectedAudio.format,
    availableQualities: audioQualities
  };
}

/**
 * Gets user-friendly quality description without misleading claims
 */
export function getQualityDescription(quality: AudioQuality['quality'], bitrate?: number): string {
  switch (quality) {
    case 'high':
      return bitrate ? `High Quality (${bitrate}kbps)` : 'High Quality (320kbps)';
    case 'medium':
      return bitrate ? `Standard Quality (${bitrate}kbps)` : 'Standard Quality (160kbps)';
    case 'low':
      return bitrate ? `Basic Quality (${bitrate}kbps)` : 'Basic Quality (96kbps)';
    default:
      return 'Good Quality (JioSaavn)';
  }
}

/**
 * Validates audio URL accessibility and format support
 */
export async function validateAudioSource(url: string): Promise<{
  isValid: boolean;
  contentType?: string;
  contentLength?: number;
  error?: string;
}> {
  try {
    // Use HEAD request to check without downloading
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors'
    });
    
    if (!response.ok) {
      return {
        isValid: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    // Validate it's actually audio content
    const isAudio = !!(contentType?.startsWith('audio/') || 
                      contentType?.includes('mpeg') ||
                      contentType?.includes('mp4'));
    
    return {
      isValid: isAudio,
      contentType: contentType || undefined,
      contentLength: contentLength ? parseInt(contentLength) : undefined,
      error: isAudio ? undefined : 'Not a valid audio file'
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}