'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { Album as AlbumType, Track as TrackType } from '@/types';
import { groupTracksByName, sortTracksInGroup } from '@/utils/trackCollapsing';
import ModernTrack from './ModernTrack';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  MusicalNoteIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

// Simple album stats component
const AlbumStatsDisplay = ({ tracks, onQualityFilter, selectedQualities }: {
  tracks: TrackType[];
  onQualityFilter: (qualities: string[]) => void;
  selectedQualities: string[];
}) => {
  const stats = useMemo(() => {
    const qualities = ['full', 'snippet', 'partial', 'unavailable'];
    return qualities.map(quality => {
      const count = tracks.filter(track => {
        const q = track.quality?.toLowerCase() || '';
        const a = track.availableLength?.toLowerCase() || '';
        switch (quality) {
          case 'full':
            return q.includes('full') || a.includes('full') || q.includes('lossless') || q.includes('cd quality');
          case 'snippet':
            return q.includes('snippet') || a.includes('snippet');
          case 'partial':
            return q.includes('partial') || a.includes('partial');
          case 'unavailable':
            return q.includes('unavailable') || q.includes('not available');
          default:
            return false;
        }
      }).length;
      return { quality, count };
    });
  }, [tracks]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ quality, count }) => (
        <button
          key={quality}
          onClick={() => {
            const isSelected = selectedQualities.includes(quality);
            const newQualities = isSelected
              ? selectedQualities.filter(q => q !== quality)
              : [...selectedQualities, quality];
            onQualityFilter(newQualities);
          }}
          className={`p-3 rounded-lg border text-center transition-all ${
            selectedQualities.includes(quality)
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="text-lg font-bold">{count}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{quality}</div>
        </button>
      ))}
    </div>
  );
};

interface ModernAlbumProps {
  album: AlbumType;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  isSearchActive?: boolean;
  currentTrack?: TrackType | null;
}

const ModernAlbum = memo(function ModernAlbum({ 
  album, 
  onPlay, 
  onScrollToTrack, 
  isSearchActive = false,
  currentTrack 
}: ModernAlbumProps) {
  const [isExpanded, setIsExpanded] = useState(isSearchActive);
  const [showStats, setShowStats] = useState(false);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [view, setView] = useState<'grouped' | 'list'>('grouped');
  
  // Auto-expand when search is active
  useEffect(() => {
    if (isSearchActive) {
      setIsExpanded(true);
    }
  }, [isSearchActive]);

  // Function to check if a track matches selected quality filters
  const matchesQualityFilter = useCallback((track: TrackType): boolean => {
    if (selectedQualities.length === 0) return true;
    
    const quality = track.quality?.toLowerCase() || '';
    const availableLength = track.availableLength?.toLowerCase() || '';
    
    return selectedQualities.some(qualityKey => {
      switch (qualityKey) {
        case 'full':
          return quality.includes('full') || 
                 availableLength.includes('full') || 
                 quality.includes('lossless') || 
                 quality.includes('cd quality');
        case 'snippet':
          return quality.includes('snippet') || 
                 availableLength.includes('snippet');
        case 'unavailable':
          return quality.includes('unavailable') || 
                 quality.includes('not available');
        default:
          return quality.includes(qualityKey.toLowerCase());
      }
    });
  }, [selectedQualities]);
  
  // Group tracks by their base name, with quality filtering
  const { groupedTracks, filteredTracks } = useMemo(() => {
    const filtered = selectedQualities.length === 0 
      ? album.tracks 
      : album.tracks.filter(matchesQualityFilter);
    
    const groups = groupTracksByName(filtered);
    const grouped = Object.entries(groups).map(([mainName, tracks]) => ({
      mainName,
      tracks: sortTracksInGroup(tracks)
    }));

    return { groupedTracks: grouped, filteredTracks: filtered };
  }, [album.tracks, selectedQualities, matchesQualityFilter]);

  const trackStats = useMemo(() => {
    const total = album.tracks.length;
    const filtered = filteredTracks.length;
    const withLinks = filteredTracks.filter(t => t.links && t.links.length > 0).length;
    const playable = filteredTracks.filter(t => {
      const quality = t.quality?.toLowerCase() || '';
      const available = t.availableLength?.toLowerCase() || '';
      return !quality.includes('not available') && !available.includes('not available') && t.links && t.links.length > 0;
    }).length;

    return { total, filtered, withLinks, playable };
  }, [album.tracks, filteredTracks]);

  const handleQualityFilter = (qualities: string[]) => {
    setSelectedQualities(qualities);
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const tracksToDisplay = view === 'grouped' ? groupedTracks : filteredTracks.map(track => ({ mainName: track.rawName, tracks: [track] }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Album Header */}
      <div 
        className="p-4 cursor-pointer transition-all duration-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700"
        onClick={handleHeaderClick}
      >
        <div className="flex items-center justify-between">
          {/* Left Side - Album Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Album Art */}
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gradient-to-br from-purple-400 to-blue-500 flex-shrink-0">
              {album.picture ? (
                <Image
                  src={album.picture}
                  alt={album.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 48px, 64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MusicalNoteIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              )}
            </div>

            {/* Album Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {album.name}
                </h2>
                {album.alternateNames && album.alternateNames.length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    ({album.alternateNames.slice(0, 2).join(', ')})
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1">
                  <MusicalNoteIcon className="w-4 h-4" />
                  <span>{trackStats.filtered} tracks</span>
                  {trackStats.filtered !== trackStats.total && (
                    <span className="text-gray-400">({trackStats.total} total)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{trackStats.playable} playable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Controls */}
          <div className="flex items-center gap-3">
            {/* Stats Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowStats(!showStats);
              }}
              className="p-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
              title="View statistics"
            >
              <FunnelIcon className="w-4 h-4" />
            </button>

            {/* Expand/Collapse */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-5 h-5" />
              ) : (
                <ChevronRightIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Stats Display */}
        {showStats && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <AlbumStatsDisplay
              tracks={album.tracks}
              onQualityFilter={handleQualityFilter}
              selectedQualities={selectedQualities}
            />
          </div>
        )}
      </div>

      {/* Tracks Content */}
      {isExpanded && (
        <div className="p-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
                <button
                  onClick={() => setView('grouped')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    view === 'grouped'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Grouped
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    view === 'list'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {trackStats.filtered} of {trackStats.total} tracks
            </div>
          </div>

          {/* Tracks Grid */}
          <div className="space-y-3">
            {tracksToDisplay.map((group, groupIndex) => (
              <div key={groupIndex}>
                {view === 'grouped' && group.tracks.length > 1 && (
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                    {group.mainName} ({group.tracks.length} versions)
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {group.tracks.map((track, trackIndex) => (
                    <ModernTrack
                      key={track.id || `${groupIndex}-${trackIndex}`}
                      track={track}
                      onPlay={onPlay}
                      onScrollToTrack={onScrollToTrack}
                      isCompact={view === 'list'}
                      isPlaying={currentTrack?.id === track.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {tracksToDisplay.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MusicalNoteIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tracks match the current filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ModernAlbum.displayName = 'ModernAlbum';

export default ModernAlbum;
