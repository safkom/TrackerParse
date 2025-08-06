'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Album as AlbumType, Track as TrackType } from '@/types';
import { groupTracksByName } from '@/utils/trackCollapsing';
import Track from './Track';
import TrackDetailPage from './TrackDetailPage';

interface ImprovedAlbumProps {
  album: AlbumType;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  isSearchActive?: boolean;
  onExpansionChange?: (expanded: boolean) => void;
  showTrackCount?: boolean;
}

interface TrackGroup {
  baseName: string;
  tracks: TrackType[];
  mainTrack: TrackType;
}

export default function ImprovedAlbum({ 
  album, 
  onPlay, 
  onScrollToTrack, 
  isSearchActive = false, 
  onExpansionChange,
  showTrackCount = false 
}: ImprovedAlbumProps) {
  const [isEraExpanded, setIsEraExpanded] = useState(isSearchActive);
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [showEraInfo, setShowEraInfo] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackType | null>(null);
  
  // Auto-expand when search is active
  useEffect(() => {
    if (isSearchActive) {
      setIsEraExpanded(true);
    }
  }, [isSearchActive]);

  // Handle expansion changes
  const handleExpansionToggle = useCallback(() => {
    const newExpanded = !isEraExpanded;
    setIsEraExpanded(newExpanded);
    onExpansionChange?.(newExpanded);
  }, [isEraExpanded, onExpansionChange]);

  // Group tracks by their base name
  const trackGroups = useMemo(() => {
    const groups = groupTracksByName(album.tracks);
    return Object.entries(groups).map(([baseName, tracks]): TrackGroup => {
      // Sort tracks within group (OG first, then by version number)
      const sortedTracks = tracks.sort((a, b) => {
        // Prioritize OG files
        const aIsOG = a.quality?.toLowerCase().includes('og') || a.rawName?.toLowerCase().includes('og');
        const bIsOG = b.quality?.toLowerCase().includes('og') || b.rawName?.toLowerCase().includes('og');
        if (aIsOG && !bIsOG) return -1;
        if (!aIsOG && bIsOG) return 1;
        
        // Then sort by version number
        const aVersion = a.title?.main.match(/\[V(\d+)\]/i)?.[1];
        const bVersion = b.title?.main.match(/\[V(\d+)\]/i)?.[1];
        if (aVersion && bVersion) {
          return parseInt(aVersion) - parseInt(bVersion);
        }
        
        return 0;
      });
      
      return {
        baseName,
        tracks: sortedTracks,
        mainTrack: sortedTracks[0] // First track is the main one
      };
    });
  }, [album.tracks]);

  const toggleSong = useCallback((baseName: string) => {
    setExpandedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(baseName)) {
        newSet.delete(baseName);
      } else {
        newSet.add(baseName);
      }
      return newSet;
    });
  }, []);

  const handleTrackClick = useCallback((track: TrackType) => {
    setSelectedTrack(track);
  }, []);

  const closeTrackDetails = useCallback(() => {
    setSelectedTrack(null);
  }, []);

  const handleEraInfoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEraInfo(true);
  }, []);

  const closeEraInfo = useCallback(() => {
    setShowEraInfo(false);
  }, []);

  return (
    <>
      <div className="mb-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-purple-200/40 dark:border-purple-700/40 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Era Header */}
        <div 
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all duration-300 rounded-t-2xl"
          onClick={handleExpansionToggle}
        >
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            {/* Era Indicator */}
            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full flex-shrink-0 shadow-sm"></div>
            
            {/* Era Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {album.name}
                </h3>
                {(album.notes || album.description) && (
                  <button
                    onClick={handleEraInfoClick}
                    className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors"
                    title="Show era information"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Era Stats */}
              {album.metadata && (
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{album.metadata.ogFiles} OG</span>
                  <span>{album.metadata.fullFiles} Full</span>
                  <span>{album.metadata.snippetFiles} Snippets</span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {showTrackCount && album.metadata.trackCount ? 
                      `${album.metadata.trackCount} tracks (click to load)` : 
                      `${album.tracks.length} total tracks`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <svg 
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isEraExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Era Content */}
        {isEraExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            {trackGroups.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No tracks found in this era
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {trackGroups.map((group) => (
                  <div key={group.baseName} className="border border-gray-100 dark:border-gray-600 rounded-lg">
                    {/* Song Header */}
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                      onClick={() => toggleSong(group.baseName)}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {group.baseName}
                          </h4>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {group.tracks.length} version{group.tracks.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      
                      <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <svg 
                          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${expandedSongs.has(group.baseName) ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Track Versions */}
                    {expandedSongs.has(group.baseName) && (
                      <div className="border-t border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-750 p-3 space-y-2">
                        {group.tracks.map((track, index) => (
                          <div 
                            key={track.id || index}
                            className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                            onClick={() => handleTrackClick(track)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                  {track.title?.main || track.rawName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {track.quality && <span className="mr-3">{track.quality}</span>}
                                  {track.trackLength && <span className="mr-3">{track.trackLength}</span>}
                                  {track.availableLength && <span>{track.availableLength}</span>}
                                </div>
                              </div>
                              
                              {/* Play Button */}
                              {onPlay && track.links?.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPlay(track);
                                  }}
                                  className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                  title="Play track"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Era Information Modal */}
      {showEraInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {album.name}
                </h3>
                <button
                  onClick={closeEraInfo}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {album.notes && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Timeline</h4>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {album.notes}
                  </div>
                </div>
              )}
              
              {album.description && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {album.description}
                  </div>
                </div>
              )}
              
              {album.metadata && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Statistics</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="font-semibold text-gray-900 dark:text-white">{album.metadata.ogFiles}</div>
                      <div className="text-gray-600 dark:text-gray-400">OG Files</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="font-semibold text-gray-900 dark:text-white">{album.metadata.fullFiles}</div>
                      <div className="text-gray-600 dark:text-gray-400">Full</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="font-semibold text-gray-900 dark:text-white">{album.metadata.snippetFiles}</div>
                      <div className="text-gray-600 dark:text-gray-400">Snippets</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="font-semibold text-gray-900 dark:text-white">{album.metadata.unavailableFiles}</div>
                      <div className="text-gray-600 dark:text-gray-400">Unavailable</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track Details Modal */}
      {selectedTrack && (
        <TrackDetailPage
          track={selectedTrack}
          onClose={closeTrackDetails}
          onPlay={onPlay}
        />
      )}
    </>
  );
}
