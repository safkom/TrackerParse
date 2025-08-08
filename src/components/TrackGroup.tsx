'use client';

import React, { useState } from 'react';
import { Track as TrackType } from '@/types';
import { TrackGroup as TrackGroupType, sortTracksInGroup } from '@/utils/trackGrouping';
import Track from './Track';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

// Helper function to sanitize track IDs for use as CSS selectors
const sanitizeTrackId = (trackId: string): string => {
  return trackId.replace(/[^a-zA-Z0-9-_]/g, '-');
};

interface TrackGroupProps {
  group: TrackGroupType;
  onPlay?: (track: TrackType) => void;
  onTrackInfo?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
}

export default function TrackGroup({ group, onPlay, onTrackInfo, onScrollToTrack }: TrackGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // If only one track, don't show grouping UI, just render the track directly.
  if (group.tracks.length <= 1) {
    return (
      <div data-track-id={sanitizeTrackId(group.tracks[0].id || group.tracks[0].rawName)} className="mb-2 last:mb-0">
        <Track track={group.tracks[0]} onPlay={onPlay} onTrackInfo={onTrackInfo} onScrollToTrack={onScrollToTrack} />
      </div>
    );
  }

  const sortedTracks = sortTracksInGroup(group.tracks);

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="track-group bg-gray-50/70 dark:bg-gray-800/70 rounded-xl overflow-hidden border border-blue-200/50 dark:border-blue-800/50 shadow-sm transition-all duration-300 ease-in-out mb-3">
      {/* Track Group Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
        onClick={handleCollapseClick}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {group.baseName}
          </span>
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-medium whitespace-nowrap">
            {group.tracks.length} version{group.tracks.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <ChevronDownIcon 
            className={`w-5 h-5 text-blue-500 dark:text-blue-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} 
          />
        </div>
      </div>

      {/* Collapsed Track List */}
      {!isCollapsed && (
        <div className="px-4 pb-3 pt-1 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="border-l-2 border-blue-200 dark:border-blue-700/50 pl-4 space-y-2">
            {sortedTracks.map((track, index) => (
              <div 
                key={track.id || `${track.rawName}-${index}`} 
                data-track-id={sanitizeTrackId(track.id || track.rawName)}
                className="group-track-item"
              >
                <Track track={track} onPlay={onPlay} onTrackInfo={onTrackInfo} onScrollToTrack={onScrollToTrack} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
