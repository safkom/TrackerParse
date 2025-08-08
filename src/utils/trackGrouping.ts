import { Track, TrackTitle } from '@/types';

export interface TrackGroup {
  id: string;
  baseName: string;
  isUnknown: boolean;
  tracks: Track[];
  mainTrack: Track; // The "main" version (usually the first one or without version suffix)
}

/**
 * Check if two tracks should be grouped together based on very strict criteria
 * Tracks should only be grouped if they are clearly the same song with minor variations
 */
function shouldGroupTracks(track1: Track, track2: Track): boolean {
  // Normalize function for comparing titles
  const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
  
  const track1Main = normalize(track1.title.main);
  const track2Main = normalize(track2.title.main);
  
  // First check: Do the main titles match exactly?
  const mainTitlesMatch = track1Main === track2Main;
  
  // If main titles don't match, check if one is an alternate name of the other
  let hasAlternateMatch = false;
  if (!mainTitlesMatch) {
    // Check if track1's main title matches any of track2's alternate names
    for (const altName of track2.title.alternateNames) {
      if (normalize(altName) === track1Main) {
        hasAlternateMatch = true;
        break;
      }
    }
    
    // Check if track2's main title matches any of track1's alternate names  
    if (!hasAlternateMatch) {
      for (const altName of track1.title.alternateNames) {
        if (normalize(altName) === track2Main) {
          hasAlternateMatch = true;
          break;
        }
      }
    }
    
    // Check if any alternate names match each other
    if (!hasAlternateMatch) {
      for (const alt1 of track1.title.alternateNames) {
        for (const alt2 of track2.title.alternateNames) {
          if (normalize(alt1) === normalize(alt2)) {
            hasAlternateMatch = true;
            break;
          }
        }
        if (hasAlternateMatch) break;
      }
    }
  }
  
  // If neither main titles match nor alternate names match, don't group
  if (!mainTitlesMatch && !hasAlternateMatch) {
    return false;
  }
  
  // Additional checks to prevent grouping tracks that happen to have the same name
  // but are clearly different songs based on context
  
  // 1. Different time periods - if dates are very different, likely different tracks
  const getYear = (dateStr: string) => {
    if (!dateStr) return null;
    const match = dateStr.match(/\d{4}/);
    return match ? parseInt(match[0]) : null;
  };
  
  const date1 = getYear(track1.fileDate || track1.leakDate || '');
  const date2 = getYear(track2.fileDate || track2.leakDate || '');
  
  if (date1 && date2 && Math.abs(date1 - date2) > 3) {
    // If tracks are more than 3 years apart, likely different songs
    return false;
  }
  
  // 2. Very different track lengths suggest different tracks
  const parseLength = (lengthStr: string) => {
    if (!lengthStr) return null;
    const match = lengthStr.match(/(\d+):(\d+)/);
    if (!match) return null;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  };
  
  const length1 = parseLength(track1.trackLength || '');
  const length2 = parseLength(track2.trackLength || '');
  
  if (length1 && length2 && Math.abs(length1 - length2) > 60) {
    // If tracks differ by more than 1 minute, likely different songs
    return false;
  }
  
  // 3. Check if notes suggest they're different contexts/recordings
  const notes1 = normalize(track1.notes || '');
  const notes2 = normalize(track2.notes || '');
  
  // Look for conflicting context clues in notes
  const contextClues = [
    'demo tape', 'compilation tape', 'world record holders',
    'hinge studios', '1997', '1998', '1999', '2000', '2001', '2002',
    'state of mind', 'go getters', 'chicago outfit',
    'track 1', 'track 2', 'track 3', 'track 4', 'track 5', 'track 6', 'track 7', 'track 8', 'track 9', 'track 10',
    'takeover', 'j dilla', 'september 1997'
  ];
  
  for (const clue of contextClues) {
    const in1 = notes1.includes(clue);
    const in2 = notes2.includes(clue);
    
    // If one has a specific context clue and the other doesn't, they might be different
    if (in1 && !in2 && notes2.length > 10) return false;
    if (in2 && !in1 && notes1.length > 10) return false;
  }
  
  // 4. For numbered tracks (Beat 1, Beat 2, etc.), they should NEVER be grouped together
  // Each numbered track is a distinct composition
  const isNumberedTrack1 = track1Main.match(/^(beat|track|song|demo|snippet|take|version|mix|edit)\s+\d+/i);
  const isNumberedTrack2 = track2Main.match(/^(beat|track|song|demo|snippet|take|version|mix|edit)\s+\d+/i);
  
  if (isNumberedTrack1 || isNumberedTrack2) {
    // Extract the base name and number for comparison
    const extractNumberedInfo = (title: string) => {
      const match = title.match(/^(beat|track|song|demo|snippet|take|version|mix|edit)\s+(\d+)/i);
      if (match) {
        return { base: match[1].toLowerCase(), number: parseInt(match[2]) };
      }
      return null;
    };
    
    const info1 = extractNumberedInfo(track1Main);
    const info2 = extractNumberedInfo(track2Main);
    
    // If both are numbered tracks with the same base type
    if (info1 && info2 && info1.base === info2.base) {
      // They should only be grouped if they have the EXACT same number
      if (info1.number !== info2.number) {
        return false; // Different numbered tracks should never be grouped
      }
    }
  }
  
  // If we passed all the checks, allow grouping
  return true;
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
 * Group tracks by their exact main title and alternate titles only
 */
export function groupTracks(tracks: Track[]): TrackGroup[] {
  // First sort tracks by title
  const sortedTracks = tracks.sort((a, b) => {
    const aTitle = (a.title?.main || a.rawName || '').toLowerCase();
    const bTitle = (b.title?.main || b.rawName || '').toLowerCase();
    return aTitle.localeCompare(bTitle);
  });

  const groups: TrackGroup[] = [];
  
  for (const track of sortedTracks) {
    const unknown = isUnknownTrack(track.title);
    
    // Try to find an existing group this track should belong to
    let foundGroup: TrackGroup | null = null;
    
    if (!unknown) { // Only do matching for non-unknown tracks
      for (const existingGroup of groups) {
        if (existingGroup.isUnknown) continue; // Don't match with unknown groups
        
        // Check if this track should be grouped with any track in the existing group
        for (const existingTrack of existingGroup.tracks) {
          if (shouldGroupTracks(track, existingTrack)) {
            foundGroup = existingGroup;
            break;
          }
        }
        
        if (foundGroup) break;
      }
    }
    
    if (foundGroup) {
      // Add to existing group
      foundGroup.tracks.push(track);
      
      // Update main track if this one seems more "canonical" (no version suffix)
      const currentMainHasVersion = foundGroup.mainTrack.title.main.match(/\s*[-_]?\s*(V\d+|Version\s*\d*|Alt\s*\d*|Demo\s*\d*|Snippet\s*\d*|Mix\s*\d*|Edit\s*\d*|Remix\s*\d*|[(\[].*[)\]])\s*$/i);
      const newTrackHasVersion = track.title.main.match(/\s*[-_]?\s*(V\d+|Version\s*\d*|Alt\s*\d*|Demo\s*\d*|Snippet\s*\d*|Mix\s*\d*|Edit\s*\d*|Remix\s*\d*|[(\[].*[)\]])\s*$/i);
      
      // Prefer track without version suffix
      if (currentMainHasVersion && !newTrackHasVersion) {
        foundGroup.mainTrack = track;
        foundGroup.baseName = track.title.main;
      }
    } else {
      // Create new group
      const groupId = `group-${groups.length + 1}`;
      const baseName = unknown ? 'Unknown' : track.title.main;
      
      // For unknown tracks, create individual groups to avoid lumping them together
      const groupKey = unknown ? `${groupId}-${track.rawName || 'unknown'}` : groupId;
      
      groups.push({
        id: groupKey,
        baseName,
        isUnknown: unknown,
        tracks: [track],
        mainTrack: track
      });
    }
  }
  
  // Sort groups: unknowns at the end, then alphabetically
  return groups.sort((a, b) => {
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
