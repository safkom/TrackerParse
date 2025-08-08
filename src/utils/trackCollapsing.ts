import { Track } from '@/types';

// Regex patterns for cleaning track titles
const PAREN_VERSION_REGEX = /\s*\([^)]*(?:version|edit|remix|mix|demo|live|acoustic|instrumental|clean|explicit|radio|studio|alt|alternative|leak|ref|reference|og|original|remaster)\b[^)]*\)/gi;
const BRACKET_VERSION_REGEX = /\s*\[[^\]]*(?:version|edit|remix|mix|demo|live|acoustic|instrumental|clean|explicit|radio|studio|alt|alternative|leak|ref|reference|og|original|remaster)\b[^\]]*\]/gi;
const TRAILING_VERSION_REGEX = /\s*(?:version|edit|remix|mix|demo|live|acoustic|instrumental|clean|explicit|radio|studio|alt|alternative|leak|ref|reference|og|original|remaster)\s*$/gi;

// NO similarity-based grouping - only exact matches or clear version relationships
// const SIMILARITY_GROUPING_THRESHOLD = 0.95; // DISABLED - was causing false groupings

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

// Check if two tracks should be grouped together - MUCH MORE STRICT
function shouldGroupTogether(track1: Track, track2: Track, cleanTitle1: string, cleanTitle2: string): boolean {
  // Only group if the clean titles are EXACTLY the same
  if (cleanTitle1.toLowerCase() === cleanTitle2.toLowerCase()) {
    return true;
  }
  
  // Check for numbered tracks that should NEVER be grouped
  // Pattern: "word number" vs "word different_number" (e.g., "Beat 2" vs "Beat 4")
  const numberedPattern = /^(.+?)\s+(\d+)(\s|$)/i;
  const match1 = cleanTitle1.match(numberedPattern);
  const match2 = cleanTitle2.match(numberedPattern);
  
  if (match1 && match2) {
    const base1 = match1[1].toLowerCase().trim();
    const base2 = match2[1].toLowerCase().trim();
    const num1 = match1[2];
    const num2 = match2[2];
    
    // If same base word but different numbers, NEVER group
    if (base1 === base2 && num1 !== num2) {
      console.log(`Preventing grouping of numbered tracks: "${cleanTitle1}" vs "${cleanTitle2}"`);
      return false;
    }
  }
  
  // Check if tracks have the same core title but one has version indicators
  // Only group if one is clearly a version of the other (e.g., "Song" and "Song [V2]")
  const coreTitle1 = cleanTitle1.toLowerCase().replace(/\s*\[v?\d+\]|\s*v\d+|\s*version\s*\d*$/gi, '').trim();
  const coreTitle2 = cleanTitle2.toLowerCase().replace(/\s*\[v?\d+\]|\s*v\d+|\s*version\s*\d*$/gi, '').trim();
  
  if (coreTitle1 === coreTitle2 && coreTitle1.length > 3) {
    // Only group if one has version indicators and the other doesn't, or both have version indicators
    const hasVersion1 = cleanTitle1.toLowerCase() !== coreTitle1;
    const hasVersion2 = cleanTitle2.toLowerCase() !== coreTitle2;
    
    if (hasVersion1 || hasVersion2) {
      console.log(`Grouping versions: "${cleanTitle1}" ↔ "${cleanTitle2}"`);
      return true;
    }
  }
  
  // Check if one track title is contained in the other's alternate names EXACTLY
  const track1MainLower = (track1.title?.main || '').toLowerCase().trim();
  const track2MainLower = (track2.title?.main || '').toLowerCase().trim();
  
  // Check if track1's main title matches any of track2's alternate names exactly
  if (track2.title?.alternateNames) {
    for (const altName of track2.title.alternateNames) {
      if (altName.toLowerCase().trim() === track1MainLower && track1MainLower.length > 3) {
        console.log(`Grouping by exact alternate name match: "${track1MainLower}" in "${track2MainLower}" alts`);
        return true;
      }
    }
  }
  
  // Check if track2's main title matches any of track1's alternate names exactly
  if (track1.title?.alternateNames) {
    for (const altName of track1.title.alternateNames) {
      if (altName.toLowerCase().trim() === track2MainLower && track2MainLower.length > 3) {
        console.log(`Grouping by exact alternate name match: "${track2MainLower}" in "${track1MainLower}" alts`);
        return true;
      }
    }
  }
  
  // NO similarity-based grouping - this was causing the false groupings
  // NO fuzzy matching - only exact matches or clear version relationships
  
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
