'use client';

import React, { useState } from 'react';
import { Track as TrackType } from '@/types';
import MetadataModal from './MetadataModal';

interface CollapsedTrackProps {
  tracks: TrackType[];
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
}

export default function CollapsedTrack({ tracks, onPlay, onScrollToTrack }: CollapsedTrackProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackType | null>(null);

  if (tracks.length === 0) return null;

  // Sort tracks by priority: ⭐ > ✨ > 🏆 > regular tracks
  const sortedTracks = [...tracks].sort((a, b) => {
    const getPriority = (track: TrackType) => {
      if (track.specialType === '⭐') return 4;
      if (track.specialType === '✨') return 3;
      if (track.specialType === '🏆') return 2;
      return 1;
    };
    return getPriority(b) - getPriority(a);
  });

  const mainTrack = sortedTracks[0];
  const hasSpecialVersions = tracks.some(track => track.isSpecial);
  const specialEmojis = Array.from(new Set(tracks.filter(track => track.isSpecial).map(track => track.specialType))).filter(Boolean);

  // Enhanced: Find playable link and type
  const getPlayableSource = (track: TrackType): { type: string, url: string, id?: string } | null => {
    if (!track.links || track.links.length === 0) return null;
    for (const link of track.links) {
      const url = typeof link === 'string' ? link : link.url;
      // Pillowcase API (pillows.su, pillowcase.su, pillowcases.su, pillowcases.top) including /f/<id> alternate links
      if (url.match(/pillow(case)?s?\.(su|top)/i)) {
        // Try to extract id from /f/<id> or anywhere in the URL
        // Match /f/<32hex> or any 32 hex chars
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

  const playable = getPlayableSource(mainTrack);
  const isPillowcase = playable?.type === 'pillowcase';
  
  // Check if track is not available based on quality or available length
  const isNotAvailable = mainTrack.quality?.toLowerCase().includes('not available') || 
                         mainTrack.availableLength?.toLowerCase().includes('not available') ||
                         mainTrack.quality?.toLowerCase().includes('unavailable') ||
                         mainTrack.availableLength?.toLowerCase().includes('unavailable');
  
  // A track has a playable link if getPlayableSource returns a valid result and track is available
  const hasPlayableLink = playable !== null && !isNotAvailable;

  const handleMetadataClick = (track: TrackType) => {
    const trackPlayable = getPlayableSource(track);
    if (trackPlayable?.type === 'pillowcase' && trackPlayable.id) {
      setSelectedTrack(track);
      setIsMetadataModalOpen(true);
    }
  };

  return (
    <>
      <div 
        className="track-item bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
        onClick={() => onScrollToTrack?.(mainTrack.id || mainTrack.rawName)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            {/* Main Title */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {mainTrack.title?.main || mainTrack.rawName}
              </h3>
              
              {/* Special Version Indicators */}
              {hasSpecialVersions && (
                <div className="flex items-center gap-1">
                  {specialEmojis.map((emoji, index) => (
                    <span key={index} className="text-sm" title={`Has ${emoji} version`}>
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Version Count and Expand Button */}
              {tracks.length > 1 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                    {tracks.length} versions
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title={isExpanded ? 'Collapse versions' : 'Show all versions'}
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Metadata button for Pillowcase tracks */}
              {isPillowcase && playable?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMetadataClick(mainTrack);
                  }}
                  className="px-2 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs rounded transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md flex items-center space-x-1"
                  title="View track metadata"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Info</span>
                </button>
              )}
            </div>
            
            {/* Alternate titles */}
            {mainTrack.title?.alternateNames && mainTrack.title.alternateNames.length > 0 && (
              <div className="mb-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Alternate name: {mainTrack.title.alternateNames.join(', ')}
                </p>
              </div>
            )}
            
            {/* Track Length */}
            {mainTrack.trackLength && (
              <div className="mb-1">
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  Length: {mainTrack.trackLength}
                </span>
              </div>
            )}
            
            {/* Features, Collaborators, Producers, References */}
            {(mainTrack.title?.features?.length > 0 || mainTrack.title?.collaborators?.length > 0 || mainTrack.title?.producers?.length > 0 || mainTrack.title?.references?.length > 0) && (
              <div className="mb-1">
                <div className="flex flex-wrap gap-1">
                  {mainTrack.title?.features?.map((feature, index) => (
                    <span key={`feat-${index}`} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      feat. {feature}
                    </span>
                  ))}
                  {mainTrack.title?.collaborators?.map((collab, index) => (
                    <span key={`with-${index}`} className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                      with {collab}
                    </span>
                  ))}
                  {mainTrack.title?.producers?.map((producer, index) => (
                    <span key={`prod-${index}`} className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                      prod. {producer}
                    </span>
                  ))}
                  {mainTrack.title?.references?.map((reference, index) => (
                    <span key={`ref-${index}`} className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                      ref. {reference}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quality */}
            <div className="mb-1">
              <div className="flex flex-wrap gap-1">
                {mainTrack.quality && (
                  <span className="text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                    Quality: {mainTrack.quality}
                  </span>
                )}
              </div>
            </div>
            
            {mainTrack.notes && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                {mainTrack.notes}
              </p>
            )}
          </div>
          
          {/* Right side - Play Button and Dates */}
          <div className="ml-3 flex flex-col items-end gap-1">
            {/* Play Button */}
            {hasPlayableLink && onPlay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(mainTrack);
                }}
                className="flex items-center justify-center w-10 h-10 music-gradient text-white rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex-shrink-0"
                title="Play track"
              >
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* Dates */}
            <div className="flex flex-col items-end gap-1 text-right">
              {mainTrack.availableLength && (
                <span className="text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded">
                  Available: {mainTrack.availableLength}
                </span>
              )}
              {mainTrack.fileDate && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                  File: {mainTrack.fileDate}
                </span>
              )}
              {mainTrack.leakDate && (
                <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                  Leak: {mainTrack.leakDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Version List */}
        {isExpanded && tracks.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-2">
              {sortedTracks.map((track, index) => (
                <div key={track.id || index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {track.isSpecial && track.specialType && (
                      <span className="text-sm flex-shrink-0">{track.specialType}</span>
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {track.title?.main || track.rawName}
                    </span>
                    {track.quality && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded flex-shrink-0">
                        {track.quality}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Metadata button for each Pillowcase track */}
                    {(() => {
                      const trackPlayable = getPlayableSource(track);
                      return trackPlayable?.type === 'pillowcase' && trackPlayable.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetadataClick(track);
                          }}
                          className="p-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                          title="View metadata"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </button>
                      );
                    })()}
                    
                    {/* Play button for each track */}
                    {(() => {
                      const trackPlayable = getPlayableSource(track);
                      return trackPlayable !== null && !isNotAvailable && onPlay && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(track);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="Play track"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Track Links */}
        {!isExpanded && mainTrack.links && mainTrack.links.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1 text-xs">Links:</span>
            <div className="flex flex-wrap gap-1">
              {mainTrack.links.map((link, index) => {
                const url = typeof link === 'string' ? link : link.url;
                const label = typeof link === 'string' ? `Link ${index + 1}` : (link.label || `Link ${index + 1}`);
                
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l-1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mainTrack.discordLink && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(mainTrack.discordLink, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              </svg>
              Discord
            </button>
          </div>
        )}
      </div>

      {/* Metadata Modal */}
      {selectedTrack && (
        <MetadataModal
          isOpen={isMetadataModalOpen}
          onClose={() => {
            setIsMetadataModalOpen(false);
            setSelectedTrack(null);
          }}
          metadataUrl={(() => {
            const trackPlayable = getPlayableSource(selectedTrack);
            return trackPlayable?.id ? `https://api.pillows.su/api/metadata/${trackPlayable.id}.txt` : '';
          })()}
          trackName={selectedTrack?.title?.main || selectedTrack?.rawName || 'Unknown Track'}
        />
      )}
    </>
  );
}
