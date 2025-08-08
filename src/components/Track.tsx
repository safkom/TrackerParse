'use client';

import React, { useState, useMemo, memo } from 'react';
import { Track as TrackType } from '@/types';
import TrackDetailPage from './TrackDetailPage';
import QualityTag from './QualityTag';
import AvailabilityTag from './AvailabilityTag';

interface TrackProps {
  track: TrackType;
  onPlay?: (track: TrackType) => void;
  onTrackInfo?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  isCompact?: boolean;
}

const Track = memo(({ track, onPlay, onTrackInfo, onScrollToTrack, isCompact = false }: TrackProps) => {
  // Remove the local modal state since we'll use the parent's modal system
  // const [showDetailPage, setShowDetailPage] = useState(false);
  
  const getPlayableSource = (track: TrackType): { type: string, url: string, id?: string } | null => {
    if (!track.links || track.links.length === 0) return null;
    for (const link of track.links) {
      const url = typeof link === 'string' ? link : link.url;
      if (url.match(/pillow(case)?s?\.(su|top)/i)) {
        let match = url.match(/\/f\/([a-f0-9]{32})/i);
        if (!match) {
          match = url.match(/([a-f0-9]{32})/i);
        }
        if (match) {
          const id = match[1];
          return { type: 'pillowcase', url, id };
        }
      }
      if (url.match(/music\.froste\.lol/i)) {
        const downloadUrl = url.endsWith('/') ? `${url}download` : `${url}/download`;
        return { type: 'froste', url: downloadUrl };
      }
    }
    return null;
  };

  const playable = getPlayableSource(track);
  
  const { isNotAvailable, hasPlayableLink } = useMemo(() => {
    const notAvailable = track.quality?.toLowerCase().includes('not available') || 
                         track.availableLength?.toLowerCase().includes('not available') ||
                         track.quality?.toLowerCase().includes('unavailable') ||
                         track.availableLength?.toLowerCase().includes('unavailable');
    
    const hasPlayable = playable !== null && !notAvailable;

    return {
      isNotAvailable: notAvailable,
      hasPlayableLink: hasPlayable
    };
  }, [track.quality, track.availableLength, playable]);
  
  const handleTrackClick = () => {
    // Use the parent's onTrackInfo callback instead of local modal
    if (onTrackInfo) {
      onTrackInfo(track);
    }
    onScrollToTrack?.(track.id || track.rawName);
  };

  // Remove local modal rendering - will be handled by parent component

  const trackClassName = `track-item bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl ${isCompact ? 'p-2' : 'p-3 sm:p-4'} border border-purple-200/30 dark:border-purple-700/30 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:border-purple-300/50 dark:hover:border-purple-600/50 ${
    track.isSpecial ? 'special-track' : ''
  } ${
    track.isWanted ? 'wanted-track' : ''
  }`;

  return (
    <div 
      className={trackClassName}
      onClick={handleTrackClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                {track.title?.main || track.rawName}
              </h3>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {track.isSpecial && track.specialType && (
                  <span 
                    className="text-sm sm:text-lg animate-pulse" 
                    title={
                      track.specialType === '⭐' ? 'Best Of' :
                      track.specialType === '✨' ? 'Special' :
                      track.specialType === '🏆' ? 'Trophy Track' :
                      'Special'
                    }
                  >
                    {track.specialType}
                  </span>
                )}
                
                {track.isWanted && track.wantedType && (
                  <span 
                    className="text-sm sm:text-lg animate-bounce" 
                    title={
                      track.wantedType === '🥇' ? 'Most Wanted' :
                      track.wantedType === '🥈' ? 'Highly Wanted' :
                      track.wantedType === '🥉' ? 'Wanted' :
                      'Wanted Track'
                    }
                  >
                    {track.wantedType}
                  </span>
                )}
              </div>
            </div>
            
            {!isCompact && track.title?.alternateNames && track.title.alternateNames.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5 line-clamp-1">
                Also: {track.title.alternateNames.slice(0, 1).join(', ')}
                {track.title.alternateNames.length > 1 && ' ...'}
              </p>
            )}
          </div>
          
          {hasPlayableLink && onPlay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(track);
              }}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 music-gradient text-white rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex-shrink-0"
              title="Play track"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {track.trackLength && (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-600 flex items-center">
              <span className="mr-1">⏱️</span>
              {track.trackLength}
            </span>
          )}
          {track.quality && (
            <QualityTag quality={track.quality} />
          )}
          {!isCompact && track.availableLength && (
            <AvailabilityTag availability={track.availableLength} />
          )}
        </div>

        {!isCompact && (
          <>
            {(track.title?.features?.length || track.title?.collaborators?.length || track.title?.producers?.length) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {track.title?.features?.slice(0, 1).map((feature, index) => (
                  <span key={`feat-${index}`} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 flex items-center">
                    <span className="mr-1">🎤</span>
                    feat. {feature.length > 8 ? feature.substring(0, 8) + '...' : feature}
                  </span>
                ))}
                {track.title?.collaborators?.slice(0, 1).map((collab, index) => (
                  <span key={`with-${index}`} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-700 flex items-center">
                    <span className="mr-1">🤝</span>
                    with {collab.length > 6 ? collab.substring(0, 6) + '...' : collab}
                  </span>
                ))}
                {track.title?.producers?.slice(0, 1).map((producer, index) => (
                  <span key={`prod-${index}`} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-700 flex items-center">
                    <span className="mr-1">🎛️</span>
                    prod. {producer.length > 6 ? producer.substring(0, 6) + '...' : producer}
                  </span>
                ))}
                {((track.title?.features?.length || 0) + (track.title?.collaborators?.length || 0) + (track.title?.producers?.length || 0) + (track.title?.references?.length || 0)) > 2 && (
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-600 flex items-center">
                    <span className="mr-1">➕</span>
                    {((track.title?.features?.length || 0) + (track.title?.collaborators?.length || 0) + (track.title?.producers?.length || 0) + (track.title?.references?.length || 0)) - 2} more
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1 text-xs pt-1">
              {track.fileDate && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-full border border-yellow-200 dark:border-yellow-700 flex items-center">
                  <span className="mr-1">📁</span>
                  File: {track.fileDate}
                </span>
              )}
              {track.leakDate && (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full border border-red-200 dark:border-red-700 flex items-center">
                  <span className="mr-1">🔓</span>
                  Leak: {track.leakDate}
                </span>
              )}
            </div>

            {track.notes && (
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 sm:line-clamp-2 pt-1">
                {track.notes}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
});

Track.displayName = 'Track';

export default Track;
