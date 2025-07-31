import { Track } from '@/types';

// Group tracks by their main name (removing version indicators)
export function groupTracksByName(tracks: Track[]): { [mainName: string]: Track[] } {
  const groups: { [mainName: string]: Track[] } = {};

  for (const track of tracks) {
    // Get the main title without version indicators
    let mainName = track.title?.main || track.rawName;

    // Remove common version indicators to group similar tracks
    mainName = mainName
      .replace(/\s*\(.*?(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+).*?\)\s*/gi, '')
      .replace(/\s*\-\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
      .replace(/\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
      .trim();

    // Also remove special emojis for grouping purposes
    mainName = mainName.replace(/[⭐✨🏆]/g, '').trim();

    const groupKey = mainName.toLowerCase();

    // Check if this main name or any alternate names match existing groups
    let foundGroup = false;

    // First, check if this track's main name matches any existing group
    if (groups[groupKey]) {
      groups[groupKey].push(track);
      foundGroup = true;
    } else {
      // Check if this track's alternate names match any existing group keys
      if (track.title?.alternateNames) {
        for (const altName of track.title.alternateNames) {
          const cleanAltName = altName
            .replace(/\s*\(.*?(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+).*?\)\s*/gi, '')
            .replace(/\s*\-\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
            .replace(/\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
            .replace(/[⭐✨🏆]/g, '')
            .trim()
            .toLowerCase();

          if (groups[cleanAltName]) {
            groups[cleanAltName].push(track);
            foundGroup = true;
            break;
          }
        }
      }

      // Check if any existing tracks have alternate names that match this track's main name
      if (!foundGroup) {
        for (const [existingKey, groupTracks] of Object.entries(groups)) {
          for (const existingTrack of groupTracks) {
            if (existingTrack.title?.alternateNames) {
              for (const existingAltName of existingTrack.title.alternateNames) {
                const cleanExistingAltName = existingAltName
                  .replace(/\s*\(.*?(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+).*?\)\s*/gi, '')
                  .replace(/\s*\-\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
                  .replace(/\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
                  .replace(/[⭐✨🏆]/g, '')
                  .trim()
                  .toLowerCase();

                if (cleanExistingAltName === groupKey) {
                  groups[existingKey].push(track);
                  foundGroup = true;
                  break;
                }
              }
              if (foundGroup) break;
            }
          }
          if (foundGroup) break;
        }
      }
    }

    // If no existing group found, create a new one
    if (!foundGroup) {
      groups[groupKey] = [track];
    }
  }

  return groups;
}

// Sort tracks within a group by version number and priority
export function sortTracksInGroup(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => {
    const aVersion = extractVersionNumber(a.title?.main || a.rawName);
    const bVersion = extractVersionNumber(b.title?.main || b.rawName);

    if (aVersion !== bVersion) {
      return aVersion - bVersion;
    }

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

    if (aQuality.includes('lossless') && !bQuality.includes('lossless')) return -1;
    if (!aQuality.includes('lossless') && bQuality.includes('lossless')) return 1;
    if (aQuality.includes('hq') && !bQuality.includes('hq')) return -1;
    if (!aQuality.includes('hq') && bQuality.includes('hq')) return 1;

    // Finally sort by name
    return (a.title?.main || a.rawName).localeCompare(b.title?.main || b.rawName);
  });
}

// Extract version number from track name (e.g., "Song - V2" -> 2)
function extractVersionNumber(trackName: string): number {
  const versionMatch = trackName.match(/\s*[-_]?\s*(?:V|Version\s*)(\d+)/i);
  if (versionMatch) {
    return parseInt(versionMatch[1], 10);
  }

  const parenVersionMatch = trackName.match(/[(\[](?:V|Version\s*)(\d+)[)\]]/i);
  if (parenVersionMatch) {
    return parseInt(parenVersionMatch[1], 10);
  }

  const numberedMatch = trackName.match(/(?:Alt|Alternative|Demo|Mix|Edit|Remix|Version)\s+(\d+)/i);
  if (numberedMatch) {
    return parseInt(numberedMatch[1], 10);
  }

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

  return 0;
}

// Check if a group should be collapsed (has multiple versions)
export function shouldCollapseGroup(tracks: Track[]): boolean {
  return tracks.length > 1;
}

