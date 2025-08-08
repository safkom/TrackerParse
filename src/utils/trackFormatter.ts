import { Track } from '@/types';

/**
 * Utilities for formatting and displaying track information
 */

export interface CleanTrackInfo {
  cleanTitle: string;
  version: string | null;
  alternateNames: string[];
  features: string[];
  collaborators: string[];
  producers: string[];
  references: string[];
  quality: string;
  availability: string;
  notes: string;
  links: any[];
}

/**
 * Clean and format track title information
 */
export function formatTrackInfo(track: Track): CleanTrackInfo {
  const title = track.title || {};
  
  // Extract clean main title (remove version info, production info, etc.)
  let cleanMainTitle = title.main || track.rawName || 'Unknown';
  
  // Remove common formatting patterns from main title
  cleanMainTitle = cleanMainTitle
    .replace(/\[V\d+\]/g, '') // Remove version markers like [V1], [V2]
    .replace(/\(feat\.[^)]+\)/g, '') // Remove feat. info from main title
    .replace(/\(prod\.[^)]+\)/g, '') // Remove prod. info from main title
    .replace(/\(ref\.[^)]+\)/g, '') // Remove ref. info from main title
    .replace(/\(with [^)]+\)/g, '') // Remove "with" collaborations from main title
    .replace(/\s+/g, ' ') // Clean up multiple spaces
    .trim();
  
  // Extract version info
  const versionMatch = (title.main || track.rawName || '').match(/\[V(\d+)\]/);
  const version = versionMatch ? `V${versionMatch[1]}` : null;
  
  return {
    cleanTitle: cleanMainTitle,
    version: version,
    alternateNames: title.alternateNames || [],
    features: title.features || [],
    collaborators: title.collaborators || [],
    producers: title.producers || [],
    references: title.references || [],
    quality: track.quality || '',
    availability: track.availableLength || '',
    notes: track.notes || '',
    links: track.links || []
  };
}

/**
 * Get a short display version of track info for compact views
 */
export function getShortTrackInfo(track: Track): string {
  const formatted = formatTrackInfo(track);
  let result = formatted.cleanTitle;
  
  if (formatted.version) {
    result += ` (${formatted.version})`;
  }
  
  if (formatted.features.length > 0) {
    result += ` feat. ${formatted.features.slice(0, 2).join(', ')}`;
    if (formatted.features.length > 2) {
      result += ` +${formatted.features.length - 2} more`;
    }
  }
  
  return result;
}

/**
 * Check if a track has playable sources
 */
export function hasPlayableSource(track: Track): boolean {
  if (!track.links || track.links.length === 0) return false;
  
  const isNotAvailable = track.quality?.toLowerCase().includes('not available') || 
                         track.availableLength?.toLowerCase().includes('not available') ||
                         track.quality?.toLowerCase().includes('unavailable') ||
                         track.availableLength?.toLowerCase().includes('unavailable');
  
  return !isNotAvailable;
}

/**
 * Get playable source from track links
 */
export function getPlayableSource(track: Track): { type: string, url: string, id?: string } | null {
  if (!hasPlayableSource(track)) return null;
  
  for (const link of track.links || []) {
    const url = typeof link === 'string' ? link : link.url;
    
    // Check for Pillowcase links
    if (url.match(/pillow(case)?s?\.(su|top)/i)) {
      let match = url.match(/\/f\/([a-f0-9]{32})/i);
      if (!match) {
        match = url.match(/([a-f0-9]{32})/i);
      }
      if (match) {
        const id = match[1];
        return { type: 'pillowcase', url, id };
      }
    }
    
    // Check for Froste links
    if (url.match(/music\.froste\.lol/i)) {
      const downloadUrl = url.endsWith('/') ? `${url}download` : `${url}/download`;
      return { type: 'froste', url: downloadUrl };
    }
  }
  
  return null;
}

/**
 * Get quality color for UI display
 */
export function getQualityColor(quality: string): string {
  const q = quality.toLowerCase();
  
  if (q.includes('lossless') || q.includes('cd quality')) return 'green';
  if (q.includes('high quality') || q.includes('320')) return 'blue';
  if (q.includes('low quality') || q.includes('snippet')) return 'yellow';
  if (q.includes('not available') || q.includes('unavailable')) return 'red';
  if (q.includes('recording')) return 'purple';
  
  return 'gray';
}

/**
 * Get availability color for UI display
 */
export function getAvailabilityColor(availability: string): string {
  const a = availability.toLowerCase();
  
  if (a.includes('full')) return 'green';
  if (a.includes('partial')) return 'yellow';
  if (a.includes('snippet')) return 'orange';
  if (a.includes('not available') || a.includes('unavailable')) return 'red';
  if (a.includes('confirmed') || a.includes('og file')) return 'blue';
  
  return 'gray';
}
