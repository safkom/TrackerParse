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

    // Check if this main name or any alternate names match existing groups
    let foundGroup = false;
    
    // First, check if this track's main name matches any existing group
    if (groups[mainName]) {
      groups[mainName].push(track);
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
            .trim();
            
          if (groups[cleanAltName]) {
            groups[cleanAltName].push(track);
            foundGroup = true;
            break;
          }
        }
      }
      
      // Check if any existing tracks have alternate names that match this track's main name
      if (!foundGroup) {
        for (const [groupKey, groupTracks] of Object.entries(groups)) {
          for (const existingTrack of groupTracks) {
            if (existingTrack.title?.alternateNames) {
              for (const existingAltName of existingTrack.title.alternateNames) {
                const cleanExistingAltName = existingAltName
                  .replace(/\s*\(.*?(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+).*?\)\s*/gi, '')
                  .replace(/\s*\-\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
                  .replace(/\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq|version|v\d+|take \d+)\s*$/gi, '')
                  .replace(/[⭐✨🏆]/g, '')
                  .trim();
                  
                if (cleanExistingAltName.toLowerCase() === mainName.toLowerCase()) {
                  groups[groupKey].push(track);
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
      groups[mainName] = [track];
    }
  }

  return groups;
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
