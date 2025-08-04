'use client';

import React, { useState, useEffect } from 'react';
import { Track as TrackType } from '@/types';
import MetadataModal from './MetadataModal';
import TrackDetailPage from './TrackDetailPage';

// Import the clean title extraction function
function extractCleanTitle(title: string): string {
  if (!title) return 'Unknown';
  
  let cleanTitle = title.trim();
  
  // Remove artist collaborations (Artist - Title format)
  const collabMatch = cleanTitle.match(/^[^-]+ - (.+)$/);
  if (collabMatch) {
    cleanTitle = collabMatch[1].trim();
  }
  
  // Remove version indicators and technical info
  cleanTitle = cleanTitle
    // Remove parenthetical version info
    .replace(/\s*\((?:v\d+|version\s*\d*|alt\s*\d*|demo\s*\d*|snippet\s*\d*|mix\s*\d*|edit\s*\d*|remix\s*\d*|instrumental\s*\d*|live\s*\d*|acoustic\s*\d*|radio\s*\d*|clean\s*\d*|explicit\s*\d*|final\s*\d*|original\s*\d*|extended\s*\d*|short\s*\d*|full\s*\d*|leak\s*\d*|cdq\s*\d*|hq\s*\d*|take\s*\d*|ref\.?[^)]*|prod\.?[^)]*|[\d]+[kmgt]?b|[\d]+hz|[\d]+kbps|lossless|flac|mp3|wav|m4a|aac|ogg|[\d:]+).*?\)\s*/gi, '')
    // Remove square bracket version info
    .replace(/\s*\[(?:v\d+|version\s*\d*|alt\s*\d*|demo\s*\d*|snippet\s*\d*|mix\s*\d*|edit\s*\d*|remix\s*\d*|instrumental\s*\d*|live\s*\d*|acoustic\s*\d*|radio\s*\d*|clean\s*\d*|explicit\s*\d*|final\s*\d*|original\s*\d*|extended\s*\d*|short\s*\d*|full\s*\d*|leak\s*\d*|cdq\s*\d*|hq\s*\d*|take\s*\d*).*?\]\s*/gi, '')
    // Remove trailing version indicators
    .replace(/\s*[-_]\s*(?:v\d+|version\s*\d*|alt\s*\d*|demo\s*\d*|snippet\s*\d*|mix\s*\d*|edit\s*\d*|remix\s*\d*|instrumental\s*\d*|live\s*\d*|acoustic\s*\d*|radio\s*\d*|clean\s*\d*|explicit\s*\d*|final\s*\d*|original\s*\d*|extended\s*\d*|short\s*\d*|full\s*\d*|leak\s*\d*|cdq\s*\d*|hq\s*\d*|take\s*\d*)\s*$/gi, '')
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

interface CollapsedTrackProps {
  tracks: TrackType[];
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
}

export default function CollapsedTrack({ tracks, onPlay, onScrollToTrack }: CollapsedTrackProps) {
  const [showVersionsView, setShowVersionsView] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [selectedMetadataTrack, setSelectedMetadataTrack] = useState<TrackType | null>(null);
  const [showDetailPage, setShowDetailPage] = useState<TrackType | null>(null);
  const [metadataStates, setMetadataStates] = useState<Record<string, boolean | null>>({}); // track id -> metadata exists

  // Enhanced: Find playable link and type
  const getPlayableSource = (track: TrackType): { type: string, url: string, id?: string } | null => {
    if (!track.links || track.links.length === 0) return null;
    for (const link of track.links) {
      const url = typeof link === 'string' ? link : link.url;
      // Pillowcase API (pillows.su, pillowcase.su, pillowcases.su, pillowcases.top) including /f/<id> alternate links
      if (url.match(/pillow(case)?s?\.(su|top)/i)) {
        // Try to extract id from /f/<id> or anywhere in the URL
        let match = url.match(/\/f\/([a-f0-9]{32})/i);
        if (!match) {
          match = url.match(/([a-f0-9]{32})/i);
        }
        if (match) {
          const id = match[1];
          return { type: 'pillowcase', url, id };
        }
      }
      
      // Music.froste.lol support - add /download to the end
      if (url.match(/music\.froste\.lol/i)) {
        const downloadUrl = url.endsWith('/') ? `${url}download` : `${url}/download`;
        return { type: 'froste', url: downloadUrl };
      }
    }
    return null;
  };

  // Function to check if metadata exists for a track
  const checkMetadataExists = async (id: string): Promise<boolean> => {
    try {
      const metadataUrl = `https://api.pillows.su/api/metadata/${id}.txt`;
      const response = await fetch(metadataUrl, {
        headers: {
          'User-Agent': 'TrackerParse/1.0',
          'Accept': 'text/plain, */*',
        },
      });
      
      if (!response.ok) {
        return false;
      }
      
      const text = await response.text();
      // Check if the response contains actual metadata (not just an error message)
      return text.trim().length > 0 && !text.toLowerCase().includes('not found') && !text.toLowerCase().includes('error');
    } catch (error) {
      console.error('Error checking metadata:', error);
      return false;
    }
  };

  // Check metadata for all tracks with pillowcase sources
  useEffect(() => {
    if (!tracks || tracks.length === 0) return;
    const checkAllMetadata = async () => {
      const newStates: Record<string, boolean | null> = {};
      const promises: Promise<void>[] = [];
      
      for (const track of tracks) {
        const playable = getPlayableSource(track);
        if (playable?.type === 'pillowcase' && playable.id) {
          const trackKey = track.id || track.rawName;
          if (metadataStates[trackKey] === undefined) {
            newStates[trackKey] = null; // Set to loading state
            
            // Create a promise for each metadata check
            const promise = checkMetadataExists(playable.id).then(exists => {
              setMetadataStates(prev => ({ 
                ...prev, 
                [trackKey]: exists 
              }));
            });
            promises.push(promise);
          }
        }
      }
      
      // Update loading states immediately
      if (Object.keys(newStates).length > 0) {
        setMetadataStates(prev => ({ ...prev, ...newStates }));
      }
      
      // Wait for all promises to complete
      await Promise.all(promises);
    };

    if (tracks.length > 0) {
      checkAllMetadata();
    }
  }, [tracks, metadataStates]);

  if (!tracks || tracks.length === 0) return null;

  const mainTrack = tracks[0];
  const hasMultipleVersions = tracks.length > 1;

  const openMetadataModal = (track: TrackType) => {
    const playable = getPlayableSource(track);
    const trackKey = track.id || track.rawName;
    if (playable?.type === 'pillowcase' && playable.id && metadataStates[trackKey] === true) {
      setSelectedMetadataTrack(track);
      setIsMetadataModalOpen(true);
    }
  };

  const openDetailPage = (track: TrackType) => {
    setShowDetailPage(track);
    onScrollToTrack?.(track.id || track.rawName);
  };

  const openVersionsView = () => {
    setShowVersionsView(!showVersionsView);
  };

  // Check if main track is playable
  const mainPlayable = getPlayableSource(mainTrack);
  const isMainNotAvailable = mainTrack.quality?.toLowerCase().includes('not available') || 
                            mainTrack.availableLength?.toLowerCase().includes('not available') ||
                            mainTrack.quality?.toLowerCase().includes('unavailable') ||
                            mainTrack.availableLength?.toLowerCase().includes('unavailable');
  const hasMainPlayableLink = mainPlayable !== null && !isMainNotAvailable;

  // Show individual track detail page
  if (showDetailPage) {
    return (
      <TrackDetailPage
        track={showDetailPage}
        onClose={() => setShowDetailPage(null)}
        onPlay={onPlay}
      />
    );
  }

  return (
    <div className="collapsed-track bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Main Track Card - Cleaner Design */}
      <div 
        className={`p-3 transition-colors ${hasMultipleVersions ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' : ''}`}
        onClick={hasMultipleVersions ? openVersionsView : (() => {
          // For single versions, open detail page directly
          openDetailPage(mainTrack);
        })}
      >
        <div className="flex items-center justify-between">
          {/* Left side - Track info */}
          <div className="flex-1 min-w-0">
            {/* Title and version count */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {extractCleanTitle(mainTrack.title?.main || mainTrack.rawName)}
              </h3>
              
              {/* Special indicator */}
              {mainTrack.isSpecial && mainTrack.specialType && (
                <span className="text-lg" title={
                  mainTrack.specialType === '⭐' ? 'Best Of' :
                  mainTrack.specialType === '✨' ? 'Special' :
                  'Wanted'
                }>
                  {mainTrack.specialType}
                </span>
              )}
              
              {/* Expand/Collapse indicator - only for multiple versions */}
              {hasMultipleVersions && (
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showVersionsView ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {/* Metadata row - Best Quality and Key Info */}
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Find the best quality track
                const bestQualityTrack = tracks.reduce((best, current) => {
                  const bestQuality = best.quality?.toLowerCase() || '';
                  const currentQuality = current.quality?.toLowerCase() || '';
                  
                  // Skip unavailable tracks for best quality
                  if (currentQuality.includes('not available') || currentQuality.includes('unavailable')) {
                    return best;
                  }
                  if (bestQuality.includes('not available') || bestQuality.includes('unavailable')) {
                    return current;
                  }
                  
                  // Priority: lossless > cd quality > high quality > anything else
                  if (currentQuality.includes('lossless') || currentQuality.includes('flac')) return current;
                  if (bestQuality.includes('lossless') || bestQuality.includes('flac')) return best;
                  if (currentQuality.includes('cd') || currentQuality.includes('320')) return current;
                  if (bestQuality.includes('cd') || bestQuality.includes('320')) return best;
                  if (currentQuality.includes('high') || currentQuality.includes('256')) return current;
                  return best;
                }, tracks[0]);

                // Check if full file has leaked - more accurate detection
                const hasFullLeak = tracks.some(track => {
                  if (!track.availableLength) return false;
                  const availableLength = track.availableLength.toLowerCase();
                  
                  // Explicit full indicators
                  if (availableLength.includes('full')) return true;
                  
                  // Check if track length matches available length (both exist and are same)
                  if (track.trackLength && track.availableLength && 
                      track.trackLength.toLowerCase() === track.availableLength.toLowerCase()) {
                    return true;
                  }
                  
                  // If it explicitly says snippet, partial, or has time indicators like "1:30" but track is longer, it's not full
                  if (availableLength.includes('snippet') || 
                      availableLength.includes('partial') ||
                      availableLength.includes('not available') ||
                      availableLength.includes('unavailable')) {
                    return false;
                  }
                  
                  // If available length looks like a time (contains :) and track length exists and is different, check if they match
                  if (availableLength.match(/\d+:\d+/) && track.trackLength) {
                    return track.trackLength.toLowerCase() === availableLength;
                  }
                  
                  return false;
                });

                // Check if best quality is unavailable
                const bestQualityUnavailable = bestQualityTrack.quality?.toLowerCase().includes('not available') || 
                                              bestQualityTrack.quality?.toLowerCase().includes('unavailable');

                return (
                  <>
                    {/* Best Quality Badge - only show if not unavailable */}
                    {bestQualityTrack.quality && !bestQualityUnavailable && (
                      <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
                        Best: {bestQualityTrack.quality.length > 15 ? bestQualityTrack.quality.substring(0, 15) + '...' : bestQualityTrack.quality}
                      </span>
                    )}
                    
                    {/* Version count badge - on same line */}
                    {hasMultipleVersions && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        {tracks.length} versions
                      </span>
                    )}
                    
                    {/* Length */}
                    {bestQualityTrack.trackLength && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                        {bestQualityTrack.trackLength}
                      </span>
                    )}
                    
                    {/* Leak Status */}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      hasFullLeak 
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                        : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                    }`}>
                      {hasFullLeak ? 'Full Leaked' : 'Partial/Snippet'}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Description/Notes */}
            {mainTrack.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                {mainTrack.notes}
              </p>
            )}
          </div>

          {/* Right side - Action buttons for single versions */}
          {!hasMultipleVersions && (
            <div className="flex items-center gap-2 ml-4">
              {/* Play Button for single version */}
              {hasMainPlayableLink && onPlay && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(mainTrack);
                  }}
                  className="flex items-center justify-center w-10 h-10 music-gradient text-white rounded-full transition-all duration-300 hover:scale-105"
                  title="Play track"
                >
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              {/* Metadata Button for single version */}
              {mainPlayable?.type === 'pillowcase' && mainPlayable.id && (() => {
                const trackKey = mainTrack.id || mainTrack.rawName;
                const metadataExists = metadataStates[trackKey];
                
                if (metadataExists === true) {
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openMetadataModal(mainTrack);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs rounded transition-all duration-200 hover:scale-105 flex items-center space-x-1"
                      title="View track metadata"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Info</span>
                    </button>
                  );
                } else if (metadataExists === null) {
                  return (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded flex items-center space-x-1">
                      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>...</span>
                    </span>
                  );
                } else if (metadataExists === false) {
                  return (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded flex items-center space-x-1" title="No metadata available">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>No info</span>
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Inline Versions View */}
      {showVersionsView && tracks.length > 1 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="p-3">
            <div className="space-y-2">
              {tracks.map((track, index) => {
                const playable = getPlayableSource(track);
                const isNotAvailable = track.quality?.toLowerCase().includes('not available') || 
                                      track.availableLength?.toLowerCase().includes('not available') ||
                                      track.quality?.toLowerCase().includes('unavailable') ||
                                      track.availableLength?.toLowerCase().includes('unavailable');
                const hasPlayableLink = playable !== null && !isNotAvailable;

                return (
                  <div 
                    key={track.id || `${track.rawName}-${index}`}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border border-gray-200 dark:border-gray-600"
                    onClick={() => {
                      // Check if track is rumored and has a link
                      const isRumored = track.quality?.toLowerCase().includes('rumored') || 
                                       track.notes?.toLowerCase().includes('rumored') ||
                                       track.rawName?.toLowerCase().includes('rumored');
                      
                      if (isRumored && hasPlayableLink) {
                        // For rumored tracks with links, just open the link
                        const playable = getPlayableSource(track);
                        if (playable) {
                          window.open(playable.url, '_blank');
                        }
                      } else {
                        // For all other tracks, open detail page
                        openDetailPage(track);
                      }
                    }}
                  >
                    {/* Track Title and Special Indicators */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {track.title?.main || track.rawName}
                          </h4>
                          {track.isSpecial && track.specialType && (
                            <span className="text-sm" title={
                              track.specialType === '⭐' ? 'Best Of' :
                              track.specialType === '✨' ? 'Special' :
                              'Wanted'
                            }>
                              {track.specialType}
                            </span>
                          )}
                        </div>
                        
                        {/* Alternate names */}
                        {track.title?.alternateNames && track.title.alternateNames.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                            Also: {track.title.alternateNames.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {/* Play Button */}
                        {hasPlayableLink && onPlay && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(track);
                            }}
                            className="flex items-center justify-center w-8 h-8 music-gradient text-white rounded-full transition-all duration-300 hover:scale-105"
                            title="Play track"
                          >
                            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}

                        {/* Metadata Button */}
                        {playable?.type === 'pillowcase' && playable.id && (() => {
                          const trackKey = track.id || track.rawName;
                          const metadataExists = metadataStates[trackKey];
                          
                          if (metadataExists === true) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMetadataModal(track);
                                }}
                                className="px-2 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs rounded transition-all duration-200 hover:scale-105 flex items-center space-x-1"
                                title="View track metadata"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span>Info</span>
                              </button>
                            );
                          } else if (metadataExists === null) {
                            return (
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded flex items-center space-x-1">
                                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>...</span>
                              </span>
                            );
                          } else if (metadataExists === false) {
                            return (
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded flex items-center space-x-1" title="No metadata available">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>No info</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {track.quality && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
                          {track.quality.length > 20 ? track.quality.substring(0, 20) + '...' : track.quality}
                        </span>
                      )}
                      {track.trackLength && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                          {track.trackLength}
                        </span>
                      )}
                      {track.availableLength && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                          {track.availableLength}
                        </span>
                      )}
                    </div>

                    {/* Dates */}
                    {(track.fileDate || track.leakDate) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {track.fileDate && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full">
                            File: {track.fileDate}
                          </span>
                        )}
                        {track.leakDate && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                            Leak: {track.leakDate}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Credits */}
                    {(track.title?.features?.length || track.title?.collaborators?.length || track.title?.producers?.length) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {track.title?.features?.slice(0, 2).map((feature, i) => (
                          <span key={`feat-${i}`} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            feat. {feature.length > 10 ? feature.substring(0, 10) + '...' : feature}
                          </span>
                        ))}
                        {track.title?.collaborators?.slice(0, 2).map((collab, i) => (
                          <span key={`with-${i}`} className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                            with {collab.length > 10 ? collab.substring(0, 10) + '...' : collab}
                          </span>
                        ))}
                        {track.title?.producers?.slice(0, 1).map((producer, i) => (
                          <span key={`prod-${i}`} className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                            prod. {producer.length > 8 ? producer.substring(0, 8) + '...' : producer}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {track.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        {track.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Metadata Modal */}
      {selectedMetadataTrack && (() => {
        const trackKey = selectedMetadataTrack.id || selectedMetadataTrack.rawName;
        const metadataExists = metadataStates[trackKey];
        return metadataExists === true ? (
          <MetadataModal
            isOpen={isMetadataModalOpen}
            onClose={() => {
              setIsMetadataModalOpen(false);
              setSelectedMetadataTrack(null);
            }}
            metadataUrl={`https://api.pillows.su/api/metadata/${getPlayableSource(selectedMetadataTrack)?.id}.txt`}
            trackName={selectedMetadataTrack?.title?.main || selectedMetadataTrack?.rawName || 'Unknown Track'}
          />
        ) : null;
      })()}
    </div>
  );
}
