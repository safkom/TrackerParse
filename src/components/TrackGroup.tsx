'use client';

import React, { useState } from 'react';
import { Track as TrackType } from '@/types';
import { TrackGroup as TrackGroupType, sortTracksInGroup } from '@/utils/trackGrouping';
import { ColorExtractor } from '@/utils/colorExtractor';
import Track from './Track';

// Helper function to sanitize track IDs for use as CSS selectors
const sanitizeTrackId = (trackId: string): string => {
  return trackId.replace(/[^a-zA-Z0-9-_]/g, '-');
};

interface TrackGroupProps {
  group: TrackGroupType;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  albumArtwork?: string; // Optional artwork URL for color extraction
}

// Era-based color mapping for consistency with sheet styling
const getEraColorClasses = (eraName: string) => {
  const era = eraName.toLowerCase().trim();
  
  // Era-specific color mappings based on common naming patterns
  if (era.includes('graduation') || era.includes('grad')) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-700',
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-400',
      dotSecondary: 'bg-amber-300 dark:bg-amber-600'
    };
  }
  
  if (era.includes('dropout') || era.includes('college')) {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
      dot: 'bg-green-500',
      text: 'text-green-700 dark:text-green-300',
      badge: 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400',
      dotSecondary: 'bg-green-300 dark:bg-green-600'
    };
  }
  
  if (era.includes('yeezus') || era.includes('yeezy')) {
    return {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-700',
      dot: 'bg-red-500',
      text: 'text-red-700 dark:text-red-300',
      badge: 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-400',
      dotSecondary: 'bg-red-300 dark:bg-red-600'
    };
  }
  
  if (era.includes('pablo') || era.includes('tlop')) {
    return {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-700',
      dot: 'bg-orange-500',
      text: 'text-orange-700 dark:text-orange-300',
      badge: 'bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-400',
      dotSecondary: 'bg-orange-300 dark:bg-orange-600'
    };
  }
  
  if (era.includes('donda') || era.includes('vultures')) {
    return {
      bg: 'bg-slate-50 dark:bg-slate-900/20',
      border: 'border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-500',
      text: 'text-slate-700 dark:text-slate-300',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      dotSecondary: 'bg-slate-300 dark:bg-slate-600'
    };
  }
  
  if (era.includes('jesus') || era.includes('jik')) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
      dot: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400',
      dotSecondary: 'bg-blue-300 dark:bg-blue-600'
    };
  }
  
  if (era.includes('watch') || era.includes('throne') || era.includes('wtt')) {
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-700',
      dot: 'bg-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-300',
      badge: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-400',
      dotSecondary: 'bg-yellow-300 dark:bg-yellow-600'
    };
  }
  
  if (era.includes('beautiful') || era.includes('fantasy') || era.includes('mbdtf')) {
    return {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200 dark:border-rose-700',
      dot: 'bg-rose-500',
      text: 'text-rose-700 dark:text-rose-300',
      badge: 'bg-rose-100 dark:bg-rose-800 text-rose-600 dark:text-rose-400',
      dotSecondary: 'bg-rose-300 dark:bg-rose-600'
    };
  }
  
  if (era.includes('808') || era.includes('heartbreak')) {
    return {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-200 dark:border-indigo-700',
      dot: 'bg-indigo-500',
      text: 'text-indigo-700 dark:text-indigo-300',
      badge: 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400',
      dotSecondary: 'bg-indigo-300 dark:bg-indigo-600'
    };
  }
  
  // Default purple for unknown eras
  return {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-700',
    dot: 'bg-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-400',
    dotSecondary: 'bg-purple-300 dark:bg-purple-600'
  };
};

export default function TrackGroup({ group, onPlay, onScrollToTrack, albumArtwork }: TrackGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(true); // All groups start collapsed
  
  // Get era from first track (all tracks in group should have same era)
  const eraName = group.tracks[0]?.era || 'Unknown';
  
  // Try to get colors from artwork first, fallback to era-based colors
  let colors = getEraColorClasses(eraName);
  
  if (albumArtwork) {
    try {
      const artworkColors = ColorExtractor.colorPaletteToTailwind(
        ColorExtractor.getEraColorScheme(albumArtwork)
      );
      if (artworkColors) {
        colors = {
          bg: artworkColors.bg,
          border: artworkColors.border,
          dot: artworkColors.accent.replace('text-', 'bg-'),
          text: artworkColors.text,
          badge: artworkColors.bg + ' ' + artworkColors.text,
          dotSecondary: artworkColors.accent.replace('text-', 'bg-') + '/70'
        };
      }
    } catch {
      // Fall back to default era colors
    }
  }
  
  // If only one track, don't show grouping UI
  if (group.tracks.length === 1) {
    return (
      <div data-track-id={sanitizeTrackId(group.tracks[0].id || group.tracks[0].rawName)} className="mb-3">
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
    <div className="track-group mb-4">
      {/* Compact Group Header */}
      <div className={`flex items-center justify-between mb-2 px-3 py-2 ${colors.bg} rounded-lg border ${colors.border} shadow-sm`}>
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full flex-shrink-0`}></div>
          <h4 className={`text-sm font-medium ${colors.text} truncate`}>
            {group.baseName}
          </h4>
          <span className={`text-xs ${colors.badge} px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0`}>
            {group.tracks.length} version{group.tracks.length !== 1 ? 's' : ''}
          </span>
        </div>
        {group.tracks.length > 1 && (
          <button
            onClick={handleCollapseClick}
            className={`flex items-center space-x-1 px-2 py-1 ${colors.text} hover:opacity-75 text-xs font-medium transition-opacity flex-shrink-0 ml-2`}
            title={isCollapsed ? 'Show all versions' : 'Show only main version'}
          >
            <span className="hidden sm:inline">{isCollapsed ? 'Show All' : 'Collapse'}</span>
            <svg 
              className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Compact Track List */}
      {isCollapsed ? (
        // Show only main track when collapsed
        <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3" data-track-id={sanitizeTrackId(group.mainTrack.id || group.mainTrack.rawName)}>
          <Track track={group.mainTrack} onPlay={onPlay} onScrollToTrack={onScrollToTrack} />
        </div>
      ) : (
        // Show all tracks with compact spacing
        <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3 space-y-2">
          {sortedTracks.map((track, index) => (
            <div key={track.id || index} className="relative" data-track-id={sanitizeTrackId(track.id || track.rawName)}>
              <div className={`absolute -left-4 top-3 w-1.5 h-1.5 ${colors.dotSecondary} rounded-full`}></div>
              <Track track={track} onPlay={onPlay} onScrollToTrack={onScrollToTrack} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
