'use client';

import React, { useState, useMemo, memo } from 'react';
import { Track as TrackType } from '@/types';
import { TrackTitle } from './TrackTitle';
import ModernTrackDetail from './ModernTrackDetail';
import QualityTag from './QualityTag';
import AvailabilityTag from './AvailabilityTag';
import { 
  PlayIcon, 
  InformationCircleIcon, 
  LinkIcon,
  MusicalNoteIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid';

interface ModernTrackProps {
  track: TrackType;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  isCompact?: boolean;
  isPlaying?: boolean;
}

const ModernTrack = memo(({ 
  track, 
  onPlay, 
  onScrollToTrack, 
  isCompact = false,
  isPlaying = false 
}: ModernTrackProps) => {
  const [showDetailPage, setShowDetailPage] = useState(false);
  
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
  
  const handleTrackClick = (e: React.MouseEvent) => {
    // Don't open detail if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    setShowDetailPage(true);
    onScrollToTrack?.(track.id || track.rawName);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPlayableLink && onPlay) {
      onPlay(track);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetailPage(true);
  };

  if (showDetailPage) {
    return (
      <ModernTrackDetail
        track={track}
        onClose={() => setShowDetailPage(false)}
        onPlay={onPlay}
        isPlaying={isPlaying}
      />
    );
  }

  return (
    <div 
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg cursor-pointer touch-manipulation tap-highlight-transparent ${
        isCompact ? 'p-3' : 'p-4'
      } ${
        track.isSpecial ? 'ring-2 ring-yellow-300 dark:ring-yellow-600' : ''
      } ${
        isPlaying ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''
      }`}
      onClick={handleTrackClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTrackClick(e as any);
        }
      }}
      aria-label={`View details for ${track.title}`}
    >
      {/* Special track indicator */}
      {track.isSpecial && track.specialType && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-sm animate-pulse">
          {track.specialType}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Play Button - Always visible on the left */}
        <button
          onClick={handlePlayClick}
          disabled={!hasPlayableLink}
          className={`flex-shrink-0 w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 touch-target touch-manipulation focus-ring ${
            hasPlayableLink
              ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white hover:scale-105 shadow-md active:scale-95'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
          title={hasPlayableLink ? 'Play track' : 'No playable source available'}
          aria-label={hasPlayableLink ? `Play ${track.title}` : 'Track not playable'}
        >
          {isPlaying ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-1 h-4 bg-white mr-0.5 animate-pulse"></div>
              <div className="w-1 h-4 bg-white animate-pulse animation-delay-150"></div>
            </div>
          ) : hasPlayableLink ? (
            <PlayIconSolid className="w-5 h-5 ml-0.5" />
          ) : (
            <MusicalNoteIcon className="w-5 h-5" />
          )}
        </button>

        {/* Track Info - Clickable area for details */}
        <div className="flex-1 min-w-0">
          <TrackTitle 
            track={track} 
            showDetails={!isCompact}
            className="mb-2"
          />

          {/* Quality and Availability Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <QualityTag quality={track.quality || ''} />
            <AvailabilityTag availability={track.availableLength || ''} />
            
            {/* Track Length */}
            {track.trackLength && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">
                <ClockIcon className="w-3 h-3" />
                <span>{track.trackLength}</span>
              </div>
            )}
            
            {/* Links Count */}
            {track.links && track.links.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                <LinkIcon className="w-3 h-3" />
                <span>{track.links.length}</span>
              </div>
            )}
          </div>

          {/* Notes Preview (only if not compact) */}
          {!isCompact && track.notes && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
              {track.notes}
            </p>
          )}
        </div>

        {/* Mobile: Info indicator */}
        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
          <InformationCircleIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Wanted Track Indicator */}
      {track.isWanted && (
        <div className="absolute bottom-2 right-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
});

ModernTrack.displayName = 'ModernTrack';

export default ModernTrack;
