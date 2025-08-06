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
  onScrollToTrack?: (trackId: string) => void;
}

export default function TrackGroup({ group, onPlay, onScrollToTrack }: TrackGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // If only one track, don't show grouping UI, just render the track directly.
  if (group.tracks.length <= 1) {
    return (
      <div data-track-id={sanitizeTrackId(group.tracks[0].id || group.tracks[0].rawName)} className="mb-2 last:mb-0">
        <Track track={group.tracks[0]} onPlay={onPlay} onScrollToTrack={onScrollToTrack} />
      </div>
    );
  }

  const sortedTracks = sortTracksInGroup(group.tracks);

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="track-group bg-white/50 dark:bg-gray-800/30 rounded-xl overflow-hidden border border-purple-200/50 dark:border-purple-800/50 shadow-sm transition-all duration-300 ease-in-out mb-3">
      {/* Group Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
        onClick={handleCollapseClick}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 truncate">
            {group.baseName}
          </h4>
          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 px-2 py-1 rounded-full font-medium whitespace-nowrap">
            {group.tracks.length} versions
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            {isCollapsed ? 'Show all' : 'Collapse'}
          </span>
          <ChevronDownIcon 
            className={`w-5 h-5 text-purple-500 dark:text-purple-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} 
          />
        </div>
      </div>

      {/* Collapsible Track List */}
      {!isCollapsed && (
        <div className="px-4 pb-3 pt-1 bg-purple-50/30 dark:bg-purple-900/10">
          <div className="border-l-2 border-purple-200 dark:border-purple-700/50 pl-4 space-y-2">
            {sortedTracks.map((track, index) => (
              <div key={track.id || index} data-track-id={sanitizeTrackId(track.id || track.rawName)}>
                <Track track={track} onPlay={onPlay} onScrollToTrack={onScrollToTrack} isCompact={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
