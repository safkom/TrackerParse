'use client';

import React, { useState, useEffect } from 'react';
import { Track as TrackType } from '@/types';
import MusicPlayer from './MusicPlayer';
import InfoCard from './InfoCard';
import QualityTag from './QualityTag';
import {
  ClockIcon,
  CalendarIcon,
  TagIcon,
  MusicalNoteIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
  LinkIcon,
  PlayCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface TrackDetailPageProps {
  track: TrackType;
  onClose: () => void;
  onPlay?: (track: TrackType) => void;
}

export default function TrackDetailPage({ track, onClose, onPlay }: TrackDetailPageProps) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <InfoCard icon={<MusicalNoteIcon className="w-6 h-6" />} title="Era">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                  <span className="mr-2">🎭</span>
                  {track.era}
                </span>
              </InfoCard>
              <InfoCard icon={<ClockIcon className="w-6 h-6" />} title="Length">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                  <span className="mr-2">⏱️</span>
                  {track.trackLength || 'Unknown'}
                </span>
              </InfoCard>
              <InfoCard icon={<TagIcon className="w-6 h-6" />} title="Quality">
                <QualityTag quality={track.quality || 'Unknown'} />
              </InfoCard>
              <InfoCard icon={<CalendarIcon className="w-6 h-6" />} title="File Date">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700">
                  <span className="mr-2">📁</span>
                  {formatDate(track.fileDate)}
                </span>
              </InfoCard>
              <InfoCard icon={<CalendarIcon className="w-6 h-6" />} title="Leak Date">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-200 dark:border-red-700">
                  <span className="mr-2">🔓</span>
                  {formatDate(track.leakDate)}
                </span>
              </InfoCard>
              
              {track.isSpecial && track.specialType && (
                <InfoCard 
                  icon={track.specialType === '🏆' ? <TrophyIcon className="w-6 h-6" /> : <SparklesIcon className="w-6 h-6" />} 
                  title="Special Status"
                >
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                    track.specialType === '⭐' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' :
                    track.specialType === '✨' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-700' :
                    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-700'
                  }`}>
                    <span className="mr-2">{track.specialType}</span>
                    {track.specialType === '⭐' ? 'Best Of' :
                     track.specialType === '✨' ? 'Special' :
                     'Wanted'}
                  </span>
                </InfoCard>
              )}
            </div>

            {/* Credits */}
            {(track.title?.features?.length || track.title?.collaborators?.length || track.title?.producers?.length) && (
              <InfoCard icon={<UserGroupIcon className="w-6 h-6" />} title="Credits" className="mb-8">
                <div className="space-y-3">
                  {track.title?.features?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <span className="mr-2">🎤</span>
                        Featured Artists
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {track.title.features.map((feature, index) => (
                          <span key={index} className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {track.title?.collaborators?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <span className="mr-2">🤝</span>
                        Collaborators
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {track.title.collaborators.map((collab, index) => (
                          <span key={index} className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full border border-green-200 dark:border-green-700">
                            {collab}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {track.title?.producers?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <span className="mr-2">🎛️</span>
                        Producers
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {track.title.producers.map((producer, index) => (
                          <span key={index} className="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-700">
                            {producer}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Description/Notes */}
            {track.notes && (
              <InfoCard icon={<InformationCircleIcon className="w-6 h-6" />} title="Notes & Description" className="mb-8">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {track.notes}
                </p>
              </InfoCard>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              {hasPlayableLink && (
                <button
                  onClick={handlePlayTrack}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  <PlayCircleIcon className="w-6 h-6" />
                  <span>Play Track</span>
                </button>
              )}

              
            </div>

            {/* Links */}
            {track.links && track.links.length > 0 && (
              <InfoCard icon={<LinkIcon className="w-6 h-6" />} title="Links">
                <div className="grid grid-cols-1 gap-3">
                  {track.links.map((link, index) => {
                    const originalUrl = typeof link === 'string' ? link : link.url;
                    const label = typeof link === 'string' ? `Link ${index + 1}` : (link.label || `Link ${index + 1}`);
                    
                    let displayUrl = originalUrl;
                    if (originalUrl.match(/music\.froste\.lol/i)) {
                      displayUrl = originalUrl.endsWith('/') ? `${originalUrl}download` : `${originalUrl}/download`;
                    }
                    
                    const isPlayableLink = (originalUrl.match(/pillow(case)?s?\.(su|top)/i) && originalUrl.match(/[a-f0-9]{32}/i)) || 
                                          originalUrl.match(/music\.froste\.lol/i);
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-lg transition-colors"
                      >
                        {isPlayableLink && onPlay && (
                          <button
                            onClick={() => {
                              const tempTrack = { ...track, links: [typeof link === 'string' ? link : link] };
                              onPlay(tempTrack);
                            }}
                            className="flex items-center justify-center w-10 h-10 music-gradient text-white rounded-full transition-all duration-300 hover:scale-105 flex-shrink-0"
                            title="Play this link"
                          >
                            <PlayCircleIcon className="w-6 h-6" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => window.open(displayUrl, '_blank', 'noopener,noreferrer')}
                          className="flex items-center space-x-2 text-blue-800 dark:text-blue-200 text-sm flex-1 min-w-0"
                        >
                          <LinkIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                        
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
              </InfoCard>
            )}
          </div>
        </div>
      </div>

      

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
