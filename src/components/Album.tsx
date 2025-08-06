'use client';

import { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import Image from 'next/image';
import { Album as AlbumType, Track as TrackType } from '@/types';
import { groupTracksByName, sortTracksInGroup } from '@/utils/trackCollapsing';

// Lazy load heavy components for better performance
const TrackGroup = lazy(() => import('./TrackGroup'));
const StatsDisplay = lazy(() => import('./StatsDisplay').then(module => ({ default: module.default })));
const ExpandedStatsDisplay = lazy(() => import('./StatsDisplay').then(module => ({ default: module.ExpandedStatsDisplay })));

interface AlbumProps {
  album: AlbumType;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  isSearchActive?: boolean;
}

const Album = memo(function Album({ album, onPlay, onScrollToTrack, isSearchActive = false }: AlbumProps) {
  const [isExpanded, setIsExpanded] = useState(isSearchActive);
  const [showStats, setShowStats] = useState(false);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  
  // Auto-expand when search is active
  useEffect(() => {
    if (isSearchActive) {
      setIsExpanded(true);
    }
  }, [isSearchActive]);

  // Function to check if a track matches selected quality filters
  const matchesQualityFilter = useCallback((track: TrackType): boolean => {
    if (selectedQualities.length === 0) return true; // Show all if no filter
    
    const quality = track.quality?.toLowerCase() || '';
    const availableLength = track.availableLength?.toLowerCase() || '';
    const rawName = track.rawName?.toLowerCase() || '';
    
    return selectedQualities.some(qualityKey => {
      switch (qualityKey) {
        case 'og':
          return quality.includes('og') || quality.includes('original') || rawName.includes('og file');
        case 'full':
          return quality.includes('full') || availableLength.includes('full') || quality.includes('lossless') || quality.includes('cd quality');
        case 'tagged':
          return quality.includes('tagged') || quality.includes('tag') || rawName.includes('tagged');
        case 'partial':
          return quality.includes('partial') || availableLength.includes('partial') || track.trackLength?.toLowerCase().includes('partial');
        case 'snippet':
          return quality.includes('snippet') || availableLength.includes('snippet') || track.trackLength?.toLowerCase().includes('snippet');
        case 'stem':
          return quality.includes('stem') || quality.includes('bounce') || rawName.includes('stem') || rawName.includes('bounce');
        case 'unavailable':
          return quality.includes('unavailable') || quality.includes('not available') || 
                 availableLength.includes('unavailable') || availableLength.includes('not available');
        default:
          return false;
      }
    });
  }, [selectedQualities]);
  
  // Group tracks by their base name, with quality filtering
  const groupedTracks = useMemo(() => {
    // First filter tracks by selected qualities
    const filteredTracks = selectedQualities.length === 0 
      ? album.tracks 
      : album.tracks.filter(matchesQualityFilter);
    
    const groups = groupTracksByName(filteredTracks);
    return Object.entries(groups).map(([mainName, tracks]) => ({
      mainName,
      tracks: sortTracksInGroup(tracks)
    }));
  }, [album.tracks, selectedQualities, matchesQualityFilter]);

  const handleQualityFilter = (qualities: string[]) => {
    setSelectedQualities(qualities);
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements (buttons, stats)
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    
    // Check if the clicked element or any of its parents (up to currentTarget) is a button
    let element = target;
    while (element && element !== currentTarget) {
      if (element.tagName === 'BUTTON' || 
          element.getAttribute('role') === 'button' ||
          element.classList.contains('stats-display') ||
          element.closest('button') ||
          element.closest('[role="button"]')) {
        return; // Don't toggle if clicking on interactive elements
      }
      element = element.parentElement as HTMLElement;
    }
    
    setIsExpanded(!isExpanded);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="album-card bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 transition-shadow duration-200 hover:shadow-lg mt-4">
      {/* Compact Album Header */}
      <div 
        className="relative p-2 sm:p-3 cursor-pointer transition-all duration-200 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
        onClick={handleHeaderClick}
      >
        <div className="flex items-center justify-between">
          {/* Era Icon + Album Art + Name */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            {/* Album Art - smaller on mobile */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
              {album.picture && album.picture.trim() !== '' ? (
                <Image
                  src={album.picture}
                  alt={album.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized={album.picture.includes('.svg')}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Era Info */}
            <div className="flex-1 min-w-0">
              {/* Era Name */}
              <h2 className="text-base sm:text-lg font-semibold truncate text-gray-900 dark:text-white">
                {album.name}
                {album.alternateNames && album.alternateNames.length > 0 && (
                  <span className="text-sm opacity-60 font-normal">
                    {' '}({album.alternateNames.join(', ')})
                  </span>
                )}
              </h2>
              
              {/* Era Description */}
              {album.description && (
                <p className="text-sm opacity-70 truncate text-gray-700 dark:text-gray-300">
                  {album.description}
                </p>
              )}
              
              {/* Track Count */}
              <span className="text-xs opacity-60 text-gray-600 dark:text-gray-400">
                {album.tracks.length} {album.tracks.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Stats Button */}
            {album.metadata && (
              <StatsDisplay
                eraName={album.name}
                metadata={album.metadata}
                isExpanded={showStats}
                onToggle={() => setShowStats(!showStats)}
                selectedQualities={selectedQualities}
                onQualityFilter={handleQualityFilter}
              />
            )}

            {/* Collapse Button */}
            <button 
              onClick={handleToggleClick}
              className="p-1.5 rounded-full transition-colors bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800"
              aria-label={isExpanded ? 'Collapse era' : 'Expand era'}
            >
              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                <svg 
                  className="w-4 h-4 text-blue-600 dark:text-blue-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
        
        {/* Era Notes/Timeline */}
        {album.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm opacity-80 text-gray-700 dark:text-gray-300">
              {album.notes.split('\n').map((line, index) => (
                line.trim() && (
                  <div key={index} className="mb-1">
                    {line.includes('(') && line.includes(')') ? (
                      // Timeline entry
                      <div className="flex items-start space-x-2">
                        <span className="text-xs opacity-60 mt-0.5">📅</span>
                        <span>{line}</span>
                      </div>
                    ) : (
                      // Sub-era or other note
                      <div className="font-medium">{line}</div>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Stats Display - now at the top when expanded */}
        {isExpanded && album.metadata && showStats && (
          <div className="mt-3 px-4">
            <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded"></div>}>
              <ExpandedStatsDisplay
                eraName={album.name}
                metadata={album.metadata}
                onClose={() => setShowStats(false)}
                selectedQualities={selectedQualities}
                onQualityFilter={handleQualityFilter}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Tracks List */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            {groupedTracks.length > 0 ? (
              <div className="space-y-2">
                {groupedTracks.map((group, index) => {
                  // Convert the data structure to match TrackGroup expectations
                  const trackGroup = {
                    id: group.mainName + index,
                    baseName: group.mainName,
                    isUnknown: false,
                    tracks: group.tracks,
                    mainTrack: group.tracks[0] // Use the first track as main track
                  };
                  
                  return (
                    <Suspense key={group.mainName + index} fallback={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded"></div>}>
                      <TrackGroup 
                        group={trackGroup}
                        onPlay={onPlay} 
                        onScrollToTrack={onScrollToTrack}
                      />
                    </Suspense>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-base font-medium mb-1">No tracks found</p>
                <p className="text-sm">This era doesn&apos;t have any tracks yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

Album.displayName = 'Album';

export default Album;
