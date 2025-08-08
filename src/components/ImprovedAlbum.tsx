'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Album as AlbumType, Track as TrackType } from '@/types';
import { groupTracksByName } from '@/utils/trackCollapsing';
import Track from './Track';
import TrackDetailPage from './TrackDetailPage';
import QualityTag from './QualityTag';

interface ImprovedAlbumProps {
  album: AlbumType;
  onPlay?: (track: TrackType) => void;
  onTrackInfo?: (track: TrackType) => void;
  isSearchActive?: boolean;
  onExpansionChange?: (expanded: boolean) => void;
  showTrackCount?: boolean;
  sheetType?: string; // Add sheetType prop
}

interface TrackGroup {
  baseName: string;
  tracks: TrackType[];
  mainTrack: TrackType;
}

export default function ImprovedAlbum({ 
  album, 
  onPlay, 
  onTrackInfo,
  isSearchActive = false, 
  onExpansionChange,
  showTrackCount = false,
  sheetType 
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

  // Group tracks by their base name (only for non-best views)
  const trackGroups = useMemo(() => {
    // For "best" view, don't group - show individual tracks like "recent" view
    if (sheetType === 'best') {
      return album.tracks.map((track, index): TrackGroup => ({
        baseName: track.title?.main || track.rawName || `Track ${index + 1}`,
        tracks: [track], // Single track per "group"
        mainTrack: track
      }));
    }
    
    // Normal grouping for other views
    const groups = groupTracksByName(album.tracks);
    return Object.entries(groups).map(([baseName, tracks]): TrackGroup => {
      // Sort tracks within group (OG first, then by version number)
      const sortedTracks = tracks.sort((a, b) => {
        // Prioritize OG files
        const aIsOG = a.quality?.toLowerCase().includes('og') || a.rawName?.toLowerCase().includes('og');
        const bIsOG = b.quality?.toLowerCase().includes('og') || b.rawName?.toLowerCase().includes('og');
        if (aIsOG && !bIsOG) return -1;
        if (!aIsOG && bIsOG) return 1;
        
        // Then sort by version number - check multiple patterns
        const getVersionNumber = (track: TrackType) => {
          const text = track.title?.main || track.rawName || '';
          
          // Check for [V1], [V2], etc.
          const vMatch = text.match(/\[V(\d+)\]/i);
          if (vMatch) return parseInt(vMatch[1]);
          
          // Check for (V1), (V2), etc.
          const vParenMatch = text.match(/\(V(\d+)\)/i);
          if (vParenMatch) return parseInt(vParenMatch[1]);
          
          // Check for Version 1, Version 2, etc.
          const versionMatch = text.match(/Version\s+(\d+)/i);
          if (versionMatch) return parseInt(versionMatch[1]);
          
          // Check for V1, V2 at the end
          const vEndMatch = text.match(/\bV(\d+)\b/i);
          if (vEndMatch) return parseInt(vEndMatch[1]);
          
          return 0; // No version found
        };
        
        const aVersion = getVersionNumber(a);
        const bVersion = getVersionNumber(b);
        
        if (aVersion && bVersion) {
          return aVersion - bVersion;
        } else if (aVersion && !bVersion) {
          return 1; // Versioned tracks come after main track
        } else if (!aVersion && bVersion) {
          return -1; // Main track comes first
        }
        
        return 0;
      });
      
      return {
        baseName,
        tracks: sortedTracks,
        mainTrack: sortedTracks[0] // First track is the main one
      };
    });
  }, [album.tracks, sheetType]);

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
    if (onTrackInfo) {
      onTrackInfo(track);
    } else {
      setSelectedTrack(track);
    }
  }, [onTrackInfo]);

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
      <div 
        className={`mb-6 bg-gradient-to-br from-white/95 to-green-50/30 dark:from-gray-800/95 dark:to-green-900/20 backdrop-blur-sm rounded-2xl border border-green-200/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] era-container ${isEraExpanded ? 'era-expanded' : ''}`}
      >
        {/* Era Header */}
        <div 
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gradient-to-r hover:from-green-50/70 hover:to-emerald-50/50 dark:hover:from-green-900/30 dark:hover:to-emerald-900/20 transition-all duration-300 rounded-t-2xl group"
          onClick={handleExpansionToggle}
        >
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            {/* Era Indicator */}
            <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex-shrink-0 shadow-lg ring-2 ring-green-200/50 dark:ring-green-700/50 group-hover:scale-110 transition-transform duration-300"></div>
            
            {/* Era Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate bg-gradient-to-r from-gray-900 to-green-900 dark:from-white dark:to-green-200 bg-clip-text text-transparent">
                  {album.name}
                </h3>
                {(album.notes || album.description) && (
                  <button
                    onClick={handleEraInfoClick}
                    className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-all duration-300 hover:scale-110 shadow-md hover:shadow-lg"
                    title="Show era information"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Era Description */}
              {album.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 italic">
                  {album.description}
                </p>
              )}
              
              {/* Era Stats - Show ALL metadata types */}
              {album.metadata && (
                <div className="flex flex-col space-y-2 text-sm mt-3">
                  <div className="text-gray-600 dark:text-gray-300 font-medium">
                    {showTrackCount && album.metadata.trackCount ? 
                      `${album.metadata.trackCount} tracks (click to load)` : 
                      `${album.tracks.length} total tracks`
                    }
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600/30 text-green-200 dark:bg-green-700/30 dark:text-green-200 border border-green-500/50 dark:border-green-600/50">
                      <span className="mr-1">👑</span>
                      {album.metadata.ogFiles || 0} OG File{(album.metadata.ogFiles || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600/30 text-blue-200 dark:bg-blue-700/30 dark:text-blue-200 border border-blue-500/50 dark:border-blue-600/50">
                      <span className="mr-1">💎</span>
                      {album.metadata.fullFiles || 0} Full
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-600/30 text-emerald-200 dark:bg-emerald-700/30 dark:text-emerald-200 border border-emerald-500/50 dark:border-emerald-600/50">
                      <span className="mr-1">🏷️</span>
                      {album.metadata.taggedFiles || 0} Tagged
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-600/30 text-yellow-200 dark:bg-yellow-700/30 dark:text-yellow-200 border border-yellow-500/50 dark:border-yellow-600/50">
                      <span className="mr-1">⚠️</span>
                      {album.metadata.partialFiles || 0} Partial
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-600/30 text-orange-200 dark:bg-orange-700/30 dark:text-orange-200 border border-orange-500/50 dark:border-orange-600/50">
                      <span className="mr-1">📱</span>
                      {album.metadata.snippetFiles || 0} Snippet{(album.metadata.snippetFiles || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-600/30 text-indigo-200 dark:bg-indigo-700/30 dark:text-indigo-200 border border-indigo-500/50 dark:border-indigo-600/50">
                      <span className="mr-1">🎚️</span>
                      {album.metadata.stemBounceFiles || 0} Stem Bounce{(album.metadata.stemBounceFiles || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-600/30 text-red-200 dark:bg-red-700/30 dark:text-red-200 border border-red-500/50 dark:border-red-600/50">
                      <span className="mr-1">❌</span>
                      {album.metadata.unavailableFiles || 0} Unavailable
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button className="p-3 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-300 group-hover:scale-110 shadow-md hover:shadow-lg">
            <svg 
              className={`w-6 h-6 text-green-600 dark:text-green-400 transition-transform duration-300 ${isEraExpanded ? 'rotate-180' : ''}`}
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
          <div className="border-t border-gradient-to-r from-green-200/30 to-emerald-200/30 dark:from-green-700/30 dark:to-emerald-700/30">
            {trackGroups.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No tracks found in this era</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tracks might still be loading...</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Help text - only show for multi-version groups */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></span>
                    <span className="font-medium">{trackGroups.length} song{trackGroups.length !== 1 ? 's' : ''}</span>
                  </span>
                  {sheetType !== 'best' && (
                    <span className="text-xs opacity-75 italic">💡 Tap song titles to see all versions</span>
                  )}
                </div>
                
                {trackGroups.map((group) => {
                  // For "best" view or single-track groups, show tracks directly
                  const showDirect = sheetType === 'best' || group.tracks.length === 1;
                  
                  if (showDirect) {
                    return group.tracks.map((track, index) => (
                      <div 
                        key={track.id || `${group.baseName}-${index}`}
                        className="p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-green-100/50 dark:border-green-700/50 hover:border-green-300 dark:hover:border-green-500 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] backdrop-blur-sm"
                        onClick={() => handleTrackClick(track)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white truncate mb-2 flex items-center space-x-2">
                              <span>{track.title?.main || track.rawName}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {track.quality && (
                                <QualityTag quality={track.quality} />
                              )}
                              {track.trackLength && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                  <span className="mr-1">⏱️</span>
                                  {track.trackLength}
                                </span>
                              )}
                              {track.availableLength && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                  track.availableLength.toLowerCase().includes('full') 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                                }`}>
                                  <span className="mr-1">
                                    {track.availableLength.toLowerCase().includes('full') ? '✅' : '⚠️'}
                                  </span>
                                  {track.availableLength}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            className="ml-4 p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-300 hover:scale-110 shadow-sm hover:shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onPlay) onPlay(track);
                            }}
                          >
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ));
                  }
                  
                  // Original grouped display for multi-track groups in non-best views
                  return (
                  <div key={group.baseName} className="border border-green-100/50 dark:border-green-700/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-r from-white/80 to-green-50/30 dark:from-gray-800/80 dark:to-green-900/20">
                    {/* Song Header */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-fuchsia-50/30 dark:hover:from-purple-900/30 dark:hover:to-fuchsia-900/20 transition-all duration-300 group"
                      onClick={() => toggleSong(group.baseName)}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-fuchsia-400 rounded-full flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-800 dark:group-hover:text-purple-300 transition-colors duration-300">
                            {group.baseName}
                          </h4>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                              🎵 {group.tracks.length} version{group.tracks.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-300 group-hover:scale-110 shadow-sm hover:shadow-md">
                        <svg 
                          className={`w-5 h-5 text-purple-500 dark:text-purple-400 transition-transform duration-300 ${expandedSongs.has(group.baseName) ? 'rotate-180' : ''}`}
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
                      <div className="border-t border-purple-100/50 dark:border-purple-700/50 bg-gradient-to-r from-purple-50/30 to-fuchsia-50/20 dark:from-purple-900/20 dark:to-fuchsia-900/10 p-4 space-y-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex items-center space-x-2">
                          <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                          <span className="italic">All versions of &ldquo;{group.baseName}&rdquo;</span>
                        </div>
                        {group.tracks.map((track, index) => (
                          <div 
                            key={track.id || index}
                            className="p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-purple-100/50 dark:border-purple-700/50 hover:border-purple-300 dark:hover:border-purple-500 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] backdrop-blur-sm"
                            onClick={() => handleTrackClick(track)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white truncate mb-2 flex items-center space-x-2">
                                  <span>{track.title?.main || track.rawName}</span>
                                  {/* Version indicator */}
                                  {(() => {
                                    const text = track.title?.main || track.rawName || '';
                                    
                                    // Check for various version patterns
                                    const vMatch = text.match(/\[V(\d+)\]/i);
                                    const vParenMatch = text.match(/\(V(\d+)\)/i);
                                    const versionMatch = text.match(/Version\s+(\d+)/i);
                                    const vEndMatch = text.match(/\bV(\d+)\b/i);
                                    
                                    const versionNumber = vMatch?.[1] || vParenMatch?.[1] || versionMatch?.[1] || vEndMatch?.[1];
                                    
                                    if (versionNumber) {
                                      return (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                          V{versionNumber}
                                        </span>
                                      );
                                    } else if (index === 0 && group.tracks.length > 1) {
                                      // First track with no version number in a multi-track group
                                      return (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                                          Main
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {track.quality && (
                                    <QualityTag quality={track.quality} />
                                  )}
                                  {track.trackLength && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                      <span className="mr-1">⏱️</span>
                                      {track.trackLength}
                                    </span>
                                  )}
                                  {track.availableLength && (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                      track.availableLength.toLowerCase().includes('full') 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700'
                                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                                    }`}>
                                      <span className="mr-1">
                                        {track.availableLength.toLowerCase().includes('full') ? '✅' : '⚠️'}
                                      </span>
                                      {track.availableLength}
                                    </span>
                                  )}
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
                  );
                })}
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

      {/* Track Details Modal - Only show if not using parent modal system */}
      {selectedTrack && !onTrackInfo && (
        <TrackDetailPage
          track={selectedTrack}
          onClose={closeTrackDetails}
          onPlay={onPlay}
        />
      )}
    </>
  );
}
