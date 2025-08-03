'use client';

import { Track } from '@/types';
import { ColorExtractor } from '@/utils/colorExtractor';
import { useMemo } from 'react';

interface TrackListProps {
  tracks: (Track & { albumName: string })[];
  onPlay?: (track: Track) => void;
  onTrackInfo?: (track: Track) => void;
}

export default function TrackList({ tracks, onPlay, onTrackInfo }: TrackListProps) {
  // Generate color scheme for search results
  const colorPalette = useMemo(() => {
    return ColorExtractor.getEraColorScheme('search-results');
  }, []);

  // Generate Tailwind classes from color palette
  const colorClasses = useMemo(() => {
    return ColorExtractor.colorPaletteToTailwind(colorPalette);
  }, [colorPalette]);

  // Enhanced: Find playable link and type (same logic as other components)
  const getPlayableSource = (track: Track): { type: string, url: string, id?: string } | null => {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 transition-shadow duration-200 hover:shadow-lg">
      {/* Search Results Header - Era-style */}
      <div 
        className={`relative p-4 ${colorClasses.bg}`}
        style={{
          background: `linear-gradient(135deg, ${colorPalette.background} 0%, ${colorPalette.primary}15 100%)`,
          borderColor: colorPalette.primary + '30'
        }}
      >
        <div className="flex items-center space-x-3">
          {/* Search Icon */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Search Results Info */}
          <div className="flex-1 min-w-0">
            <h2 
              className="text-lg font-semibold"
              style={{ color: colorPalette.text }}
            >
              Search Results
            </h2>
            <span 
              className="text-xs opacity-60"
              style={{ color: colorPalette.text }}
            >
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} found
            </span>
          </div>
        </div>
      </div>
      
      {/* Tracks List */}
      <div className="px-4 pb-4">
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
          <div className="space-y-3">
            {tracks.map((track, index) => {
              // Check if track is playable
              const playable = getPlayableSource(track);
              const isNotAvailable = track.quality?.toLowerCase().includes('not available') || 
                                    track.availableLength?.toLowerCase().includes('not available') ||
                                    track.quality?.toLowerCase().includes('unavailable') ||
                                    track.availableLength?.toLowerCase().includes('unavailable');
              const hasPlayableLink = playable !== null && !isNotAvailable;

              return (
                <div 
                  key={track.id || index}
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Track Title */}
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {track.title?.main || track.rawName}
                      </h4>
                      {track.isSpecial && (
                        <span className="text-xs">
                          {track.specialType === '🏆' && '🏆'}
                          {track.specialType === '✨' && '✨'}
                          {track.specialType === '⭐' && '⭐'}
                        </span>
                      )}
                    </div>

                    {/* Era badge with era-like styling */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: colorPalette.primary + '20',
                          color: colorPalette.primary,
                          border: `1px solid ${colorPalette.primary}30`
                        }}
                      >
                        📁 {track.albumName}
                      </span>
                    </div>

                    {/* Features, collaborators, producers */}
                    {(track.title?.features?.length || track.title?.collaborators?.length || track.title?.producers?.length) && (
                      <div className="flex flex-wrap gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {track.title?.features?.map((feature, i) => (
                          <span key={i} className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                            feat. {feature}
                          </span>
                        ))}
                        {track.title?.collaborators?.map((collab, i) => (
                          <span key={i} className="bg-green-100 dark:bg-green-900 px-1 rounded">
                            with {collab}
                          </span>
                        ))}
                        {track.title?.producers?.map((producer, i) => (
                          <span key={i} className="bg-purple-100 dark:bg-purple-900 px-1 rounded">
                            prod. {producer}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Track metadata */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      {track.quality && (
                        <div>Quality: {track.quality}</div>
                      )}
                      {track.trackLength && (
                        <div>Length: {track.trackLength}</div>
                      )}
                      {track.leakDate && (
                        <div>Leak Date: {track.leakDate}</div>
                      )}
                      {track.notes && (
                        <div className="text-gray-600 dark:text-gray-300 mt-1">
                          Notes: {track.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="ml-4 flex space-x-2">
                    {/* Info button */}
                    {onTrackInfo && (
                      <button
                        onClick={() => onTrackInfo(track)}
                        className="p-2 rounded-full transition-colors"
                        style={{ 
                          backgroundColor: colorPalette.secondary + '20',
                          border: `1px solid ${colorPalette.secondary}30`
                        }}
                        aria-label="Track info"
                      >
                        <svg 
                          className="w-4 h-4" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                          style={{ color: colorPalette.secondary }}
                        >
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}

                    {/* Play button */}
                    {onPlay && hasPlayableLink && (
                      <button
                        onClick={() => onPlay(track)}
                        className="p-2 rounded-full transition-colors"
                        style={{ 
                          backgroundColor: colorPalette.primary + '20',
                          border: `1px solid ${colorPalette.primary}30`
                        }}
                        aria-label="Play track"
                      >
                        <svg 
                          className="w-4 h-4" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                          style={{ color: colorPalette.primary }}
                        >
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
