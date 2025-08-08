'use client';

import React, { useState, useEffect } from 'react';
import { Track as TrackType } from '@/types';
import MusicPlayer from './MusicPlayer';

interface TrackDetailPageProps {
  track: TrackType;
  onClose: () => void;
  onPlay?: (track: TrackType) => void;
}

export default function TrackDetailPage({ track, onClose, onPlay }: TrackDetailPageProps) {
  const [currentTrack, setCurrentTrack] = useState<TrackType | null>(null);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);

  // Improved body scroll management for mobile
  useEffect(() => {
    // Store original values
    const originalBodyStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      height: document.body.style.height
    };
    
    const originalDocumentStyle = {
      overflow: document.documentElement.style.overflow
    };
    
    // Get current scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    // Apply mobile-friendly scroll lock
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.right = '0';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.documentElement.style.overflow = 'hidden';
    
    // Restore everything on cleanup
    return () => {
      // Restore styles
      Object.assign(document.body.style, originalBodyStyle);
      Object.assign(document.documentElement.style, originalDocumentStyle);
      
      // Restore scroll position
      window.scrollTo(scrollX, scrollY);
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
      
      // YouTube
      if (url.match(/(youtube\.com|youtu\.be)/i)) {
        return { type: 'youtube', url };
      }
      
      // SoundCloud
      if (url.includes('soundcloud.com')) {
        return { type: 'soundcloud', url };
      }
      
      // Direct audio
      if (url.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        return { type: 'audio', url };
      }
    }
    // Fallback: first link
    return { type: 'other', url: track.links[0].url };
  };

  const playable = getPlayableSource(track);
  const hasPlayableLink = !!playable;

  const handlePlay = () => {
    if (onPlay) {
      onPlay(track);
    } else {
      setCurrentTrack(track);
      setShowMusicPlayer(true);
    }
  };

  const handleCloseMusicPlayer = () => {
    setShowMusicPlayer(false);
    setCurrentTrack(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close on direct backdrop click, not on mobile touch events that might be scroll gestures
    if (e.target === e.currentTarget && e.detail !== 0) {
      onClose();
    }
  };

  const InfoItem = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="text-gray-700 dark:text-gray-300">{children}</div>
    </div>
  );

  const QualityBadge = ({ quality }: { quality: string }) => {
    const getQualityColor = (quality: string) => {
      const q = quality.toLowerCase();
      if (q.includes('og') || q.includes('original')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      if (q.includes('cd') || q.includes('lossless')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      if (q.includes('high')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      if (q.includes('low') || q.includes('poor')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      if (q.includes('unavailable') || q.includes('not available')) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQualityColor(quality)}`}>
        {quality}
      </span>
    );
  };

  return (
    <>
      {/* Mobile-optimized Modal Overlay */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 touch-none"
        onClick={handleBackdropClick}
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {/* Mobile-optimized Modal Content */}
        <div 
          className="fixed inset-0 bg-white dark:bg-gray-900 md:inset-4 md:top-16 md:rounded-2xl md:max-w-4xl md:mx-auto md:my-auto md:h-fit md:max-h-[90vh] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          {/* Header - Now with better mobile spacing */}
          <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:px-6 md:py-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {track.title?.main || track.rawName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {track.era}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-2 w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors touch-manipulation flex-shrink-0"
                aria-label="Close"
                style={{
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content with improved mobile handling */}
          <div 
            className="overflow-y-auto overscroll-contain h-full md:max-h-[calc(90vh-88px)]" 
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              scrollbarWidth: 'thin'
            }}
          >
            <div className="p-4 md:p-6 space-y-6 pb-6 md:pb-6 min-h-[50vh]">{/* Ensure minimum height for proper scrolling */}
              {/* Play Button */}
              {hasPlayableLink && (
                <div className="text-center">
                  <button
                    onClick={handlePlay}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl transition-colors shadow-lg touch-manipulation min-h-[48px]"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Play Track
                  </button>
                </div>
              )}

              {/* Track Info Grid */}
              <div className="grid gap-4">
                <InfoItem icon="🎵" title="Era">
                  <span className="font-mono text-sm">{track.era}</span>
                </InfoItem>

                {track.trackLength && (
                  <InfoItem icon="⏱️" title="Length">
                    <span className="font-mono text-sm">{track.trackLength}</span>
                  </InfoItem>
                )}

                {track.quality && (
                  <InfoItem icon="💎" title="Quality">
                    <QualityBadge quality={track.quality} />
                  </InfoItem>
                )}

                {track.fileDate && (
                  <InfoItem icon="📅" title="File Date">
                    <span className="font-mono text-sm">{new Date(track.fileDate).toLocaleDateString()}</span>
                  </InfoItem>
                )}

                {track.leakDate && (
                  <InfoItem icon="📅" title="Leak Date">
                    <span className="font-mono text-sm">{new Date(track.leakDate).toLocaleDateString()}</span>
                  </InfoItem>
                )}

                {track.isSpecial && (
                  <InfoItem icon={track.specialType === '🏆' ? '🏆' : '✨'} title="Special">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{track.specialType}</span>
                      <span>
                        {track.specialType === '🏆' ? 'Trophy Track' :
                         track.specialType === '⭐' ? 'Star Track' :
                         track.specialType === '✨' ? 'Special Track' :
                         'Special Content'}
                      </span>
                    </div>
                  </InfoItem>
                )}

                {track.title?.features && track.title.features.length > 0 && (
                  <InfoItem icon="🤝" title="Features">
                    <div className="flex flex-wrap gap-2">
                      {track.title.features.map((feature, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-lg text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </InfoItem>
                )}

                {track.title?.producers && track.title.producers.length > 0 && (
                  <InfoItem icon="🎛️" title="Producers">
                    <div className="flex flex-wrap gap-2">
                      {track.title.producers.map((producer, index) => (
                        <span key={index} className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded-lg text-sm">
                          {producer}
                        </span>
                      ))}
                    </div>
                  </InfoItem>
                )}

                {track.notes && (
                  <InfoItem icon="📝" title="Notes">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{track.notes}</p>
                  </InfoItem>
                )}

                {track.links && track.links.length > 0 && (
                  <InfoItem icon="🔗" title="Links">
                    <div className="space-y-2">
                      {track.links.map((link, index) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors touch-manipulation min-h-[48px] flex items-center"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-blue-600 dark:text-blue-400 text-sm">🔗</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">{link.platform || 'External Link'}</span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{link.url}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </a>
                      ))}
                    </div>
                  </InfoItem>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Music Player */}
      {showMusicPlayer && currentTrack && (
        <MusicPlayer
          track={currentTrack}
          isVisible={showMusicPlayer}
          onClose={handleCloseMusicPlayer}
        />
      )}
    </>
  );
}
