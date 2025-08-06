'use client';

import React, { useState, useEffect } from 'react';
import { Track as TrackType } from '@/types';
import MetadataModal from './MetadataModal';
import MusicPlayer from './MusicPlayer';

interface TrackDetailPageProps {
  track: TrackType;
  onClose: () => void;
  onPlay?: (track: TrackType) => void;
}

export default function TrackDetailPage({ track, onClose, onPlay }: TrackDetailPageProps) {
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackType | null>(null);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);

  // Enhanced: Find playable link and type
  const getPlayableSource = (track: TrackType): { type: string, url: string, id?: string } | null => {
    if (!track.links || track.links.length === 0) return null;
    for (const link of track.links) {
      const url = typeof link === 'string' ? link : link.url;
      // Pillowcase API
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
      
      // Music.froste.lol support
      if (url.match(/music\.froste\.lol/i)) {
        const downloadUrl = url.endsWith('/') ? `${url}download` : `${url}/download`;
        return { type: 'froste', url: downloadUrl };
      }
    }
    return null;
  };

  const playable = getPlayableSource(track);
  const isPillowcase = playable?.type === 'pillowcase';
  
  // Check if track is not available
  const isNotAvailable = track.quality?.toLowerCase().includes('not available') || 
                         track.availableLength?.toLowerCase().includes('not available') ||
                         track.quality?.toLowerCase().includes('unavailable') ||
                         track.availableLength?.toLowerCase().includes('unavailable');
  
  const hasPlayableLink = playable !== null && !isNotAvailable;

  const handlePlayTrack = () => {
    if (hasPlayableLink) {
      if (onPlay) {
        // Use the parent's player instead of creating our own
        onPlay(track);
      } else {
        // Only set our own player if no parent player is available
        setCurrentTrack(track);
        setShowMusicPlayer(true);
      }
    }
  };

  const handleMetadataClick = () => {
    if (isPillowcase && playable?.id) {
      setIsMetadataModalOpen(true);
    }
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Find similar tracks (same main title)
  const getSimilarNames = () => {
    const names = [];
    if (track.title?.main && track.title.main !== track.rawName) {
      names.push(track.title.main);
    }
    if (track.title?.alternateNames) {
      names.push(...track.title.alternateNames);
    }
    if (track.rawName && !names.includes(track.rawName)) {
      names.push(track.rawName);
    }
    return names;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '0' || dateStr === 'Unknown 0') return 'Unknown';
    if (dateStr.includes('?')) return 'Unknown';
    if (dateStr.toLowerCase() === 'unknown') return 'Unknown';
    return dateStr;
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md overflow-y-auto p-2 sm:p-4 z-50 flex justify-center items-start"
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl w-full max-w-xs sm:max-w-4xl shadow-2xl border border-purple-200/50 dark:border-purple-700/50 overflow-hidden mt-4 mb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200/30 dark:border-purple-700/30 p-4 sm:p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 flex-1 pr-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {track.title?.main || track.rawName}
            </h1>
            {/* Special indicators in header */}
            {track.isSpecial && track.specialType && (
              <span className="text-xl animate-pulse" title="Special Track">
                {track.specialType}
              </span>
            )}
            {track.isWanted && track.wantedType && (
              <span className="text-xl animate-bounce" title="Wanted Track">
                {track.wantedType}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
          <div className="p-6">
          {/* Track Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              {/* Era Badge */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Era</h3>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {track.era}
                </span>
              </div>

              {/* Special Status */}
              {track.isSpecial && track.specialType && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Special Status</h3>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    track.specialType === '⭐' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    track.specialType === '✨' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {track.specialType} {
                      track.specialType === '⭐' ? 'Best Of' :
                      track.specialType === '✨' ? 'Special' :
                      'Wanted'
                    }
                  </span>
                </div>
              )}

              {/* Similar Names */}
              {getSimilarNames().length > 1 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Similar Names</h3>
                  <div className="space-y-1">
                    {getSimilarNames().map((name, index) => (
                      <div key={index} className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Track Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Track Length</h3>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {track.trackLength || 'Unknown'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Available Length</h3>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {track.availableLength || 'Unknown'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quality</h3>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {track.quality || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Dates & Metadata */}
            <div className="space-y-6">
              {/* Dates */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">File Date</h3>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(track.fileDate)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Leak Date</h3>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(track.leakDate)}
                  </p>
                </div>
              </div>

              {/* Credits */}
              {(track.title?.features?.length || track.title?.collaborators?.length || track.title?.producers?.length || track.title?.references?.length) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Credits</h3>
                  <div className="space-y-2">
                    {track.title?.features?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Features:</span>
                        {track.title.features.map((feature, index) => (
                          <span key={index} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                    {track.title?.collaborators?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Collaborators:</span>
                        {track.title.collaborators.map((collab, index) => (
                          <span key={index} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                            {collab}
                          </span>
                        ))}
                      </div>
                    )}
                    {track.title?.producers?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Producers:</span>
                        {track.title.producers.map((producer, index) => (
                          <span key={index} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                            {producer}
                          </span>
                        ))}
                      </div>
                    )}
                    {track.title?.references?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">References:</span>
                        {track.title.references.map((reference, index) => (
                          <span key={index} className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                            {reference}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description/Notes */}
          {track.notes && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notes & Description</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {track.notes}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-8">
            {hasPlayableLink && (
              <button
                onClick={handlePlayTrack}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Play Track</span>
              </button>
            )}

            {isPillowcase && playable?.id && (
              <button
                onClick={handleMetadataClick}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>View Metadata</span>
              </button>
            )}
          </div>

          {/* Links */}
          {track.links && track.links.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Links</h3>
              <div className="grid grid-cols-1 gap-3">
                {track.links.map((link, index) => {
                  const originalUrl = typeof link === 'string' ? link : link.url;
                  const label = typeof link === 'string' ? `Link ${index + 1}` : (link.label || `Link ${index + 1}`);
                  
                  // Transform froste URLs for display and playback
                  let displayUrl = originalUrl;
                  if (originalUrl.match(/music\.froste\.lol/i)) {
                    displayUrl = originalUrl.endsWith('/') ? `${originalUrl}download` : `${originalUrl}/download`;
                  }
                  
                  // Check if this link is playable
                  const isPlayableLink = (originalUrl.match(/pillow(case)?s?\.(su|top)/i) && originalUrl.match(/[a-f0-9]{32}/i)) || 
                                        originalUrl.match(/music\.froste\.lol/i);
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-lg transition-colors"
                    >
                      {/* Play Button - only show for playable links */}
                      {isPlayableLink && onPlay && (
                        <button
                          onClick={() => {
                            // Create a temporary track object for this specific link
                            const tempTrack = {
                              ...track,
                              links: [typeof link === 'string' ? link : link] // Keep the original link format
                            };
                            onPlay(tempTrack);
                          }}
                          className="flex items-center justify-center w-10 h-10 music-gradient text-white rounded-full transition-all duration-300 hover:scale-105 flex-shrink-0"
                          title="Play this link"
                        >
                          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Info Button - shows link details */}
                      <button
                        onClick={() => {
                          // Show link details in an alert (temporary solution)
                          const linkInfo = `Link ${index + 1}: ${originalUrl}\nType: ${
                            originalUrl.match(/pillow(case)?s?\.(su|top)/i) ? 'Pillowcase' :
                            originalUrl.match(/music\.froste\.lol/i) ? 'Froste' : 'External'
                          }\nPlayable: ${isPlayableLink ? 'Yes' : 'No'}`;
                          alert(linkInfo);
                        }}
                        className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full transition-all duration-300 hover:scale-105 flex-shrink-0"
                        title="Info for this link"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Link Button */}
                      <button
                        onClick={() => window.open(displayUrl, '_blank', 'noopener,noreferrer')}
                        className="flex items-center space-x-2 text-blue-800 dark:text-blue-200 text-sm flex-1 min-w-0"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l-1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">{label}</span>
                      </button>
                      
                      {/* Link type indicator */}
                      <div className="flex-shrink-0">
                        {originalUrl.match(/pillow(case)?s?\.(su|top)/i) && (
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                            Pillowcase
                          </span>
                        )}
                        {originalUrl.match(/music\.froste\.lol/i) && (
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full">
                            Froste
                          </span>
                        )}
                        {!originalUrl.match(/pillow(case)?s?\.(su|top)/i) && !originalUrl.match(/music\.froste\.lol/i) && (
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                            External
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Metadata Modal */}
      {isPillowcase && playable?.id && (
        <MetadataModal
          isOpen={isMetadataModalOpen}
          onClose={() => setIsMetadataModalOpen(false)}
          metadataUrl={`https://api.pillows.su/api/metadata/${playable.id}.txt`}
          trackName={track?.title?.main || track?.rawName || 'Unknown Track'}
        />
      )}

      {/* Music Player */}
      {showMusicPlayer && currentTrack && (
        <MusicPlayer
          track={currentTrack}
          isVisible={showMusicPlayer}
          onClose={() => {
            setShowMusicPlayer(false);
            setCurrentTrack(null);
          }}
        />
      )}
    </div>
  );
}
