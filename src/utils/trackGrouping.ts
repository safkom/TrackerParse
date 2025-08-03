import { Track, TrackTitle } from '@/types';

export interface TrackGroup {
  id: string;
  baseName: string;
  isUnknown: boolean;
  tracks: Track[];
  mainTrack: Track; // The "main" version (usually the first one or without version suffix)
}

/**
 * Extract the base name from a track title, removing version suffixes
 */
export function extractBaseName(title: TrackTitle): string {
  if (!title.main) return 'Unknown';
  
  let baseName = title.main;
  
  // Handle artist collaborations first - extract main track name
  const artistCollabMatch = baseName.match(/^[^-]+ - (.+)$/);
  if (artistCollabMatch) {
    baseName = artistCollabMatch[1].trim();
  }
  
  // Remove version patterns first [V1], [V2], etc.
  baseName = baseName.replace(/\s*\[V\d+\]\s*/gi, ' ');
  
  // Remove common version patterns - enhanced for better matching
  baseName = baseName.replace(/\s*[-_]\s*(V\d+|Version\s*\d*|Alt\s*\d*|Alternative\s*\d*|Demo\s*\d*|Snippet\s*\d*|Mix\s*\d*|Edit\s*\d*|Remix\s*\d*|Instrumental\s*\d*|Accapella\s*\d*|Acoustic\s*\d*|Live\s*\d*|Radio\s*\d*|Clean\s*\d*|Explicit\s*\d*|Final\s*\d*|Original\s*\d*|Extended\s*\d*|Short\s*\d*|Full\s*\d*|Leak\s*\d*|CDQ\s*\d*|HQ\s*\d*)\s*$/i, '');
  
  // Remove parenthetical content that looks like technical metadata, references, or quality info
  // Keep alternate names that might be useful for grouping
  const PAREN_REF_PATTERN = 'ref\\.?[^)]*';
  const PAREN_PROD_PATTERN = 'prod\\.?[^)]*';
  const PAREN_SIZE_PATTERN = '[\\d]+[kmgt]?b';
  const PAREN_FREQ_PATTERN = '[\\d]+hz';
  const PAREN_BITRATE_PATTERN = '[\\d]+kbps';
  const PAREN_FORMAT_PATTERN = 'lossless|flac|mp3|wav|m4a|aac|ogg';
  const PAREN_TIME_PATTERN = '[\\d:]+';
  const PAREN_CONTENT_PATTERN = `${PAREN_REF_PATTERN}|${PAREN_PROD_PATTERN}|${PAREN_SIZE_PATTERN}|${PAREN_FREQ_PATTERN}|${PAREN_BITRATE_PATTERN}|${PAREN_FORMAT_PATTERN}|${PAREN_TIME_PATTERN}`;
  const PAREN_REGEX = new RegExp(`\\s*\\((${PAREN_CONTENT_PATTERN})\\)\\s*`, 'gi');
  baseName = baseName.replace(PAREN_REGEX, ' ');
  
  // Remove square brackets with version info or other metadata
  baseName = baseName.replace(/\s*\[[^\]]*\]\s*/g, ' ');
  
  // Remove standalone version indicators at the end
  baseName = baseName.replace(/\s+(V\d+|Version\s*\d*|Alt\s*\d*|Alternative\s*\d*|Demo\s*\d*|Snippet\s*\d*|Mix\s*\d*|Edit\s*\d*|Remix\s*\d*|Instrumental\s*\d*|Final\s*\d*|Original\s*\d*|Extended\s*\d*|Short\s*\d*|Full\s*\d*|Leak\s*\d*|CDQ\s*\d*|HQ\s*\d*)$/i, '');
  
  // Remove quality indicators and technical specs
  baseName = baseName.replace(/\s*-\s*([\d]+[kmgt]?b|[\d]+hz|[\d]+kbps|lossless|flac|mp3|wav|m4a|aac|ogg)\s*$/i, '');
  
  // Remove trailing punctuation, dashes, and normalize spaces
  baseName = baseName.replace(/[\s\-_,\/]+$/, '').replace(/\s+/g, ' ').trim();
  
  // Remove leading/trailing quotes or brackets
  baseName = baseName.replace(/^['""`\[\(]+|['""`\]\)]+$/g, '');
  
  // Handle unknown/??? grouping
  if (baseName.toLowerCase().includes('unknown') || baseName.includes('???') || !baseName || baseName.trim() === '') {
    return 'Unknown';
  }
  
  // If the base name is now too short or generic, check alternate names
  if (baseName.length < 3 && title.alternateNames && title.alternateNames.length > 0) {
    for (const altName of title.alternateNames) {
      if (altName && altName.length > 3 && !altName.toLowerCase().includes('unknown')) {
        // Use the first substantial alternate name as the base
        let altBase = altName.trim();
        // Clean it similarly but more conservatively
        altBase = altBase.replace(/\s+/g, ' ').trim();
        if (altBase.length > 3) {
          return altBase;
        }
      }
    }
  }
  
  return baseName || 'Unknown';
}

/**
 * Check if two tracks should be grouped together based on base name or alternate names
 */
function shouldGroupTracks(track1: Track, track2: Track): boolean {
  const baseName1 = extractBaseName(track1.title);
  const baseName2 = extractBaseName(track2.title);
  
  // Direct base name match
  if (baseName1 === baseName2) return true;
  
  // Check if any alternate names match
  const allNames1 = [track1.title.main, ...track1.title.alternateNames].map(name => 
    name.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
  ).filter(name => name.length > 2);
  
  const allNames2 = [track2.title.main, ...track2.title.alternateNames].map(name => 
    name.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
  ).filter(name => name.length > 2);
  
  // Check for overlap in names
  for (const name1 of allNames1) {
    for (const name2 of allNames2) {
      if (name1 === name2) return true;
      // Check for high similarity - lowered from 0.9 to 0.95 to be more strict
      if (calculateSimilarity(name1, name2) >= 0.95) return true;
    }
  }
  
  return false;
}

/**
 * Check if a track name indicates it's unknown/untitled
 */
export function isUnknownTrack(title: TrackTitle): boolean {
  if (title.isUnknown) return true;
  
  const name = title.main.toLowerCase();
  return name.includes('???') || 
         name.includes('unknown') || 
         name.includes('untitled') ||
         name.includes('unnamed') ||
         name.startsWith('track ') ||
         /^unknown\s*\d*$/i.test(name);
}

/**
 * Calculate similarity between two strings (0-1 scale)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Group tracks by their base name and unknown status
 */
export function groupTracks(tracks: Track[]): TrackGroup[] {
  // First sort tracks by title
  const sortedTracks = tracks.sort((a, b) => {
    const aTitle = (a.title?.main || a.rawName || '').toLowerCase();
    const bTitle = (b.title?.main || b.rawName || '').toLowerCase();
    return aTitle.localeCompare(bTitle);
  });

  const groups = new Map<string, TrackGroup>();
  
  for (const track of sortedTracks) {
    const baseName = extractBaseName(track.title);
    const unknown = isUnknownTrack(track.title);
    
    // Try to find an existing group this track should belong to
    let foundGroup: string | null = null;
    
    if (!unknown) { // Only do matching for non-unknown tracks
      for (const [existingKey, existingGroup] of groups.entries()) {
        if (existingGroup.isUnknown) continue; // Don't match with unknown groups
        
        // Check if this track should be grouped with any track in the existing group
        for (const existingTrack of existingGroup.tracks) {
          if (shouldGroupTracks(track, existingTrack)) {
            foundGroup = existingKey;
            break;
          }
        }
        
        if (foundGroup) break;
      }
    }
    
    // Create a normalized key for grouping
    const normalizedBaseName = baseName.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Create a unique key for grouping
    const groupKey = foundGroup || (unknown ? `__unknown__${Date.now()}_${normalizedBaseName}` : normalizedBaseName);
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: `group-${groupKey.replace(/\s+/g, '-')}`,
        baseName,
        isUnknown: unknown,
        tracks: [],
        mainTrack: track
      });
    }
    
    const group = groups.get(groupKey)!;
    group.tracks.push(track);
    
    // Update main track - prefer the one with the most complete title and no version suffix
    const currentMainHasVersion = group.mainTrack.title.main.match(/\s*[-_]?\s*(V\d+|Version\s*\d*|Alt\s*\d*|Alternative\s*\d*|Demo\s*\d*|Snippet\s*\d*|Mix\s*\d*|Edit\s*\d*|Remix\s*\d*|[(\[].*[)\]])\s*$/i);
    const newTrackHasVersion = track.title.main.match(/\s*[-_]?\s*(V\d+|Version\s*\d*|Alt\s*\d*|Alternative\s*\d*|Demo\s*\d*|Snippet\s*\d*|Mix\s*\d*|Edit\s*\d*|Remix\s*\d*|[(\[].*[)\]])\s*$/i);
    
    // Prefer track without version suffix, or longer/more complete title
    if (currentMainHasVersion && !newTrackHasVersion) {
      group.mainTrack = track;
      // Update the group's base name to the better one
      group.baseName = extractBaseName(track.title);
    } else if (!currentMainHasVersion && !newTrackHasVersion && track.title.main.length > group.mainTrack.title.main.length) {
      group.mainTrack = track;
      group.baseName = extractBaseName(track.title);
    }
  }
  
  // Sort groups: unknowns at the end, then alphabetically
  return Array.from(groups.values()).sort((a, b) => {
    if (a.isUnknown !== b.isUnknown) {
      return a.isUnknown ? 1 : -1;
    }
    return a.baseName.localeCompare(b.baseName);
  });
}

/**
 * Sort tracks within a group by version number
 */
export function sortTracksInGroup(tracks: Track[]): Track[] {
  return tracks.sort((a, b) => {
    const aVersion = extractVersionNumber(a.title.main);
    const bVersion = extractVersionNumber(b.title.main);
    
    if (aVersion !== bVersion) {
      return aVersion - bVersion;
    }
    
    // If same version number, sort alphabetically
    return a.title.main.localeCompare(b.title.main);
  });
}

/**
 * Extract version number from track name (e.g., "Song - V2" -> 2, "Song (Alt)" -> 0.5)
 */
function extractVersionNumber(trackName: string): number {
  // Look for explicit version numbers
  const versionMatch = trackName.match(/\s*[-_]?\s*(?:V|Version\s*)(\d+)/i);
  if (versionMatch) {
    return parseInt(versionMatch[1], 10);
  }
  
  // Look for parenthetical version numbers
  const parenVersionMatch = trackName.match(/[(\[](?:V|Version\s*)(\d+)[)\]]/i);
  if (parenVersionMatch) {
    return parseInt(parenVersionMatch[1], 10);
  }
  
  // Look for numbered alternatives like "Alt 2", "Demo 3", etc.
  const numberedMatch = trackName.match(/(?:Alt|Alternative|Demo|Mix|Edit|Remix|Version)\s+(\d+)/i);
  if (numberedMatch) {
    return parseInt(numberedMatch[1], 10);
  }
  
  // Assign values to common version indicators (lower values = higher priority)
  const lowerName = trackName.toLowerCase();
  if (lowerName.includes('original') || lowerName.includes('main') || lowerName.includes('final')) return 0;
  if (lowerName.includes('demo')) return 0.1;
  if (lowerName.includes('snippet')) return 0.2;
  if (lowerName.includes('alt') || lowerName.includes('alternative')) return 0.5;
  if (lowerName.includes('edit')) return 0.6;
  if (lowerName.includes('mix') || lowerName.includes('remix')) return 0.7;
  if (lowerName.includes('instrumental')) return 0.8;
  if (lowerName.includes('acoustic')) return 0.9;
  if (lowerName.includes('live')) return 1.0;
  if (lowerName.includes('radio')) return 1.1;
  if (lowerName.includes('extended')) return 1.2;
  if (lowerName.includes('clean')) return 1.3;
  if (lowerName.includes('explicit')) return 1.4;
  
  // Default (likely the main version)
  return 0;
}
