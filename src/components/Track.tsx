'use client';

import React, { useState, useEffect } from 'react';
import { Track as TrackType } from '@/types';
import MetadataModal from './MetadataModal';
import TrackDetailPage from './TrackDetailPage';

interface TrackProps {
  track: TrackType;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
}

export default function Track({ track, onPlay, onScrollToTrack }: TrackProps) {
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [metadataExists, setMetadataExists] = useState<boolean | null>(null); // null = unknown, true = exists, false = doesn't exist
  const [metadataChecked, setMetadataChecked] = useState(false);
  
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

  const playable = getPlayableSource(track);
  const isPillowcase = playable?.type === 'pillowcase';
  
  // Function to check if metadata exists
  const checkMetadataExists = async (id: string): Promise<boolean> => {
    try {
      const metadataUrl = `https://api.pillows.su/api/metadata/${id}.txt`;
      const response = await fetch(`/api/proxy-metadata?url=${encodeURIComponent(metadataUrl)}`);
      
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

  // Check metadata availability when component mounts and playable source is available
  useEffect(() => {
    if (isPillowcase && playable?.id && !metadataChecked) {
      setMetadataChecked(true);
      checkMetadataExists(playable.id).then(exists => {
        setMetadataExists(exists);
      });
    }
  }, [isPillowcase, playable?.id, metadataChecked]);
  
  // Check if track is not available based on quality or available length
  const isNotAvailable = track.quality?.toLowerCase().includes('not available') || 
                         track.availableLength?.toLowerCase().includes('not available') ||
                         track.quality?.toLowerCase().includes('unavailable') ||
                         track.availableLength?.toLowerCase().includes('unavailable');
  
  const hasPlayableLink = playable !== null && !isNotAvailable;

  const handleTrackClick = () => {
    setShowDetailPage(true);
    onScrollToTrack?.(track.id || track.rawName);
  };

  if (showDetailPage) {
    return (
      <TrackDetailPage
        track={track}
        onClose={() => setShowDetailPage(false)}
        onPlay={onPlay}
      />
    );
  }

  return (
    <div 
      className="track-item bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
      onClick={handleTrackClick}
    >
      {/* Mobile-first compact layout */}
      <div className="space-y-2">
        {/* Top row - Title and Play button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                {track.title?.main || track.rawName}
              </h3>
              
              {/* Special indicator */}
              {track.isSpecial && track.specialType && (
                <span className="text-sm sm:text-lg flex-shrink-0" title={
                  track.specialType === '⭐' ? 'Best Of' :
                  track.specialType === '✨' ? 'Special' :
                  'Wanted'
                }>
                  {track.specialType}
                </span>
              )}
              
              {/* Metadata button for Pillowcase tracks - mobile only */}
              {isPillowcase && playable?.id && metadataExists === true && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMetadataModalOpen(true);
                  }}
                  className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs rounded transition-all duration-200 flex items-center space-x-1 sm:hidden flex-shrink-0"
                  title="View track metadata"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Info</span>
                </button>
              )}
            </div>
            
            {/* Alternate titles - more compact on mobile */}
            {track.title?.alternateNames && track.title.alternateNames.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5 line-clamp-1">
                Also: {track.title.alternateNames.slice(0, 1).join(', ')}
                {track.title.alternateNames.length > 1 && ' ...'}
              </p>
            )}
          </div>
          
          {/* Play Button - smaller on mobile */}
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

        {/* Second row - Key info tags (mobile optimized) */}
        <div className="flex flex-wrap gap-1">
          {track.trackLength && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              {track.trackLength}
            </span>
          )}
          {track.quality && (
            <span className="text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
              {track.quality.length > 12 ? track.quality.substring(0, 12) + '...' : track.quality}
            </span>
          )}
          {track.availableLength && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
              {track.availableLength}
            </span>
          )}
        </div>

        {/* Third row - Credits (collapsed on mobile) */}
        {(track.title?.features?.length || track.title?.collaborators?.length || track.title?.producers?.length) && (
          <div className="flex flex-wrap gap-0.5 sm:gap-1">
            {track.title?.features?.slice(0, 1).map((feature, index) => (
              <span key={`feat-${index}`} className="text-xs px-1 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                feat. {feature.length > 8 ? feature.substring(0, 8) + '...' : feature}
              </span>
            ))}
            {track.title?.collaborators?.slice(0, 1).map((collab, index) => (
              <span key={`with-${index}`} className="text-xs px-1 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                with {collab.length > 6 ? collab.substring(0, 6) + '...' : collab}
              </span>
            ))}
            
            {/* Show count if there are more credits */}
            {((track.title?.features?.length || 0) + (track.title?.collaborators?.length || 0) + (track.title?.producers?.length || 0) + (track.title?.references?.length || 0)) > 2 && (
              <span className="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                +{((track.title?.features?.length || 0) + (track.title?.collaborators?.length || 0) + (track.title?.producers?.length || 0) + (track.title?.references?.length || 0)) - 2} more
              </span>
            )}
          </div>
        )}

        {/* Fourth row - Dates (mobile layout) */}
        <div className="flex flex-wrap gap-1 text-xs">
          {track.fileDate && (
            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full">
              File: {track.fileDate}
            </span>
          )}
          {track.leakDate && (
            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
              Leak: {track.leakDate}
            </span>
          )}
        </div>

        {/* Notes - truncated on mobile */}
        {track.notes && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 sm:line-clamp-2">
            {track.notes}
          </p>
        )}

        {/* Desktop/tablet metadata button */}
        {isPillowcase && playable?.id && metadataExists === true && (
          <div className="hidden sm:flex justify-start">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMetadataModalOpen(true);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs rounded transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md flex items-center space-x-1"
              title="View track metadata"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>View Metadata</span>
            </button>
          </div>
        )}
      </div>

      {/* Metadata Modal */}
      {isPillowcase && playable?.id && metadataExists === true && (
        <MetadataModal
          isOpen={isMetadataModalOpen}
          onClose={() => setIsMetadataModalOpen(false)}
          metadataUrl={`https://api.pillows.su/api/metadata/${playable.id}.txt`}
          trackName={track?.title?.main || track?.rawName || 'Unknown Track'}
        />
      )}
    </div>
  );
}
