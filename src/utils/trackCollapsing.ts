import { Track } from '@/types';

// Enhanced grouping with better pattern matching
export function groupTracksByName(tracks: Track[]): { [mainName: string]: Track[] } {
  const groups: { [mainName: string]: Track[] } = {};

  for (const track of tracks) {
    const mainName = extractCleanTitle(track.title?.main || track.rawName);
    
    // Check if this track belongs to an existing group
    let foundGroup = false;
    
    // First, check exact main name match
    if (groups[mainName]) {
      groups[mainName].push(track);
      foundGroup = true;
    } else {
      // Check for similarity with existing groups
      for (const [groupKey, groupTracks] of Object.entries(groups)) {
        if (shouldGroupTogether(track, groupTracks[0], mainName, groupKey)) {
          groups[groupKey].push(track);
          foundGroup = true;
          break;
        }
      }
    }
    
    // If no existing group found, create a new one
    if (!foundGroup) {
      groups[mainName] = [track];
    }
  }

  return groups;
}

// Extract clean title for grouping
function extractCleanTitle(title: string): string {
  if (!title) return 'Unknown';
  
  let cleanTitle = title.trim();
  
  // Remove artist collaborations (Artist - Title format)
  const collabMatch = cleanTitle.match(/^[^-]+ - (.+)$/);
  if (collabMatch) {
    cleanTitle = collabMatch[1].trim();
  }
  
  // Remove version indicators and technical info (but preserve years)
  cleanTitle = cleanTitle
    // Remove parenthetical version info
    .replace(PAREN_VERSION_REGEX, '')
    // Remove square bracket version info
    .replace(BRACKET_VERSION_REGEX, '')
    // Remove trailing version indicators (but NOT years - be more specific)
    .replace(TRAILING_VERSION_REGEX, '')
    // Remove special emojis for grouping
    .replace(/[⭐✨🏆]/g, '')
    // Clean up extra spaces and punctuation
    .replace(/\s+/g, ' ')
    .replace(/[\s\-_,\/]+$/, '')
    .trim();

  // Handle unknown tracks
  if (cleanTitle.toLowerCase().includes('unknown') || 
      cleanTitle.includes('???') || 
      cleanTitle.toLowerCase().includes('untitled') ||
      !cleanTitle || cleanTitle.length < 2) {
    return 'Unknown';
  }

  return cleanTitle || 'Unknown';
}

// Check if two tracks should be grouped together
function shouldGroupTogether(track1: Track, track2: Track, cleanTitle1: string, cleanTitle2: string): boolean {
  // Direct clean title match
  if (cleanTitle1.toLowerCase() === cleanTitle2.toLowerCase()) {
    return true;
  }
  
  // Special check: if one title is just the other + a year, don't group them
  const title1Lower = cleanTitle1.toLowerCase();
  const title2Lower = cleanTitle2.toLowerCase();
  
  // Check if one title ends with a 4-digit year and the other doesn't
  const year1Match = title1Lower.match(/(\d{4})$/);
  const year2Match = title2Lower.match(/(\d{4})$/);
  
  if (year1Match && !year2Match) {
    // title1 has year, title2 doesn't - check if title2 is just title1 without year
    const title1WithoutYear = title1Lower.replace(/\s*\d{4}$/, '').trim();
    if (title1WithoutYear === title2Lower) {
      console.log(`Preventing grouping: "${cleanTitle1}" vs "${cleanTitle2}" (year difference)`);
      return false; // Don't group "Song 2018" with "Song"
    }
  } else if (!year1Match && year2Match) {
    // title2 has year, title1 doesn't
    const title2WithoutYear = title2Lower.replace(/\s*\d{4}$/, '').trim();
    if (title2WithoutYear === title1Lower) {
      console.log(`Preventing grouping: "${cleanTitle1}" vs "${cleanTitle2}" (year difference)`);
      return false;
    }
  }
  
  // Check similarity score - made more strict to avoid false groupings
  const similarity = calculateSimilarity(cleanTitle1.toLowerCase(), cleanTitle2.toLowerCase());
  if (similarity >= SIMILARITY_GROUPING_THRESHOLD) {
    return true;
  }
  
  // Check alternate names
  const track1Names = getAllTrackNames(track1);
  const track2Names = getAllTrackNames(track2);
  
  for (const name1 of track1Names) {
    for (const name2 of track2Names) {
      if (name1 === name2 || calculateSimilarity(name1, name2) >= 0.98) {
        return true;
      }
    }
  }
  
  return false;
}

// Get all possible names for a track
function getAllTrackNames(track: Track): string[] {
  const names = [];
  
  // Main title
  if (track.title?.main) {
    names.push(extractCleanTitle(track.title.main).toLowerCase());
  }
  
  // Raw name
  if (track.rawName) {
    names.push(extractCleanTitle(track.rawName).toLowerCase());
  }
  
  // Alternate names
  if (track.title?.alternateNames) {
    for (const altName of track.title.alternateNames) {
      if (altName && altName.trim()) {
        names.push(extractCleanTitle(altName).toLowerCase());
      }
    }
  }
  
  return [...new Set(names)].filter(name => name.length > 2);
}

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Sort tracks within a group by priority
export function sortTracksInGroup(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => {
    // Priority: ⭐ > ✨ > 🏆 > regular tracks
    const getPriority = (track: Track) => {
      if (track.specialType === '⭐') return 4;
      if (track.specialType === '✨') return 3; 
      if (track.specialType === '🏆') return 2;
      return 1;
    };

    const aPriority = getPriority(a);
    const bPriority = getPriority(b);
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    // If same priority, sort by quality or other factors
    const aQuality = a.quality?.toLowerCase() || '';
    const bQuality = b.quality?.toLowerCase() || '';
    
    // Prefer better quality
    if (aQuality.includes('lossless') && !bQuality.includes('lossless')) return -1;
    if (!aQuality.includes('lossless') && bQuality.includes('lossless')) return 1;
    if (aQuality.includes('hq') && !bQuality.includes('hq')) return -1;
    if (!aQuality.includes('hq') && bQuality.includes('hq')) return 1;
    
    // Finally sort by name
    return (a.title?.main || a.rawName).localeCompare(b.title?.main || b.rawName);
  });
}

// Check if a group should be collapsed (has multiple versions)
export function shouldCollapseGroup(tracks: Track[]): boolean {
  return tracks.length > 1;
}
