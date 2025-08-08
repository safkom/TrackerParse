'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Track } from '@/types';

interface MusicPlayerProps {
  track: Track | null;
  isVisible: boolean;
  onClose: () => void;
  onInfo?: (track: Track) => void;
}

export default function MusicPlayer({ track, isVisible, onClose, onInfo }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);


  // Enhanced: Find playable link and type
  const getPlayableSource = (track: Track): { type: string, url: string, id?: string } | null => {
    if (!track.links || track.links.length === 0) return null;
    for (const link of track.links) {
      // Pillowcase API (pillows.su, pillowcase.su, pillowcases.su, pillowcases.top) including /f/<id> alternate links
      if (link.url.match(/pillow(case)?s?\.(su|top)/i)) {
        // Try to extract id from /f/<id> or anywhere in the URL
        // Match /f/<32hex> or any 32 hex chars
        let match = link.url.match(/\/f\/([a-f0-9]{32})/i);
        if (!match) {
          match = link.url.match(/([a-f0-9]{32})/i);
        }
        if (match) {
          const id = match[1];
          // Use .mp3 extension for download
          return { type: 'pillowcase', url: `https://api.pillows.su/api/download/${id}.mp3`, id };
        }
      }
      // Music.froste.lol support - add /download to the end
      if (link.url.match(/music\.froste\.lol/i)) {
        const downloadUrl = link.url.endsWith('/') ? `${link.url}download` : `${link.url}/download`;
        return { type: 'froste', url: downloadUrl };
      }
      // YouTube
      if (link.url.match(/(youtube\.com|youtu\.be)/i)) {
        return { type: 'youtube', url: link.url };
      }
      // SoundCloud
      if (link.url.includes('soundcloud.com')) {
        return { type: 'soundcloud', url: link.url };
      }
      // Direct audio
      if (link.url.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        return { type: 'audio', url: link.url };
      }
    }
    // Fallback: first link
    return { type: 'other', url: track.links[0].url };
  };

  const playable = track ? getPlayableSource(track) : null;
  const audioUrl = playable && (playable.type === 'audio' || playable.type === 'pillowcase' || playable.type === 'froste') ? playable.url : null;
  const isSoundCloudLink = playable?.type === 'soundcloud';
  const isYouTubeLink = playable?.type === 'youtube';

  // For YouTube: convert to audio stream via API
  const [youtubeAudioUrl, setYoutubeAudioUrl] = useState<string | null>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isYouTubeLink && playable?.url) {
      setLoading(true);
      setError(null);
      setYoutubeError(null);
      fetch(`/api/youtube-audio?url=${encodeURIComponent(playable.url)}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to fetch YouTube audio');
          }
          const data = await res.json();
          if (data.url) {
            setYoutubeAudioUrl(data.url);
          } else {
            throw new Error(data.message || 'No audio URL returned');
          }
        })
        .catch((err) => {
          setYoutubeError(err.message);
          setError(null); // Don't show as general error
        })
        .finally(() => setLoading(false));
    } else {
      setYoutubeAudioUrl(null);
      setYoutubeError(null);
    }
  }, [isYouTubeLink, playable?.url]);


  useEffect(() => {
    if (audioRef.current && audioUrl && !isSoundCloudLink) {
      const audio = audioRef.current;

      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleLoadStart = () => setLoading(true);
      const handleCanPlay = () => {
        setLoading(false);
        // Auto-play when track loads
        audio.play().catch(() => {
          setError('Failed to auto-play audio');
          setTimeout(() => setError(null), 3000);
        });
      };
      const handleError = () => {
        setError('Failed to load audio');
        setLoading(false);
      };

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [audioUrl, isSoundCloudLink]);

  // Auto-start playing when track changes
  useEffect(() => {
    if (track && audioRef.current && audioUrl) {
      // Reset time to beginning
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      // Auto-play
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setError(null);
      }).catch(() => {
        setError('Failed to auto-play audio');
        setTimeout(() => setError(null), 3000);
      });
    }
  }, [track, audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      setError(null);
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          setError('Failed to play audio');
          setTimeout(() => setError(null), 3000);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
  };

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible || !track) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-xl music-player-mobile"
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: 9999,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        minHeight: '80px',
        overscrollBehavior: 'contain',
        contain: 'layout style',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      <div className="max-w-7xl mx-auto px-3 py-3 md:px-4 md:py-4">
        <div className="flex flex-col space-y-2 sm:space-y-3">
          {/* Track Info and Controls Row */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
            {/* Track Info - Left */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-base font-medium text-gray-900 dark:text-white truncate">
                  {track.title?.main || track.rawName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {track.era}
                </p>
              </div>
              {onInfo && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onInfo(track);
                  }}
                  className="p-1.5 sm:p-2.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 flex-shrink-0"
                  title="Track info"
                  aria-label="View track info"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Player Controls - Center */}
            <div className="flex items-center justify-center space-x-2 sm:space-x-4 justify-self-center">
              {(audioUrl && !isSoundCloudLink && !isYouTubeLink) || (youtubeAudioUrl) ? (
                <button
                  onClick={togglePlayPause}
                  disabled={loading}
                  className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center transition-colors active:scale-95"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                  ) : isPlaying ? (
                    <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-7 sm:h-7 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ) : isSoundCloudLink && playable?.url ? (
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md px-4 py-3 min-w-[320px] max-w-[400px]">
                  <iframe
                    width="100%"
                    height="80"
                    scrolling="no"
                    frameBorder="no"
                    allow="autoplay"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(playable.url)}&color=%233b82f6&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false`}
                    className="rounded-md flex-1"
                    title="SoundCloud Player"
                  ></iframe>
                </div>
              ) : isYouTubeLink && playable?.url && youtubeError ? (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Audio conversion not available
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(playable.url, '_blank', 'noopener,noreferrer');
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Open YouTube
                  </button>
                </div>
              ) : isYouTubeLink && playable?.url && !youtubeAudioUrl ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Converting YouTube audio...</span>
                </div>
              ) : !audioUrl && !isSoundCloudLink && !isYouTubeLink && playable?.url ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(playable.url, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  Open Link
                </button>
              ) : null}
            </div>

            {/* Volume Control - Right (Hidden on mobile) */}
            <div className="flex justify-end justify-self-end">
              {((audioUrl && !isSoundCloudLink && !isYouTubeLink) || youtubeAudioUrl) && (
                <div className="hidden sm:flex items-center space-x-2 w-32">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.78L4.676 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.676l3.707-3.78a1 1 0 011.617.78z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={handleVolumeChange}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #d1d5db ${volume * 100}%, #d1d5db 100%)`
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 sm:w-11 sm:h-11 ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors flex-shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 flex items-center justify-center"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar Row */}
          {((audioUrl && !isSoundCloudLink && !isYouTubeLink) || youtubeAudioUrl) && (
            <div className="flex items-center space-x-3 px-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[3rem]">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={handleSeek}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${duration ? (currentTime / duration) * 100 : 0}%, #d1d5db ${duration ? (currentTime / duration) * 100 : 0}%, #d1d5db 100%)`
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[3rem]">
                {formatTime(duration)}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Audio Elements */}
        {audioUrl && !isSoundCloudLink && !isYouTubeLink && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => {
              setIsPlaying(true);
              setError(null);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        )}
        {youtubeAudioUrl && (
          <audio
            ref={audioRef}
            src={youtubeAudioUrl}
            onPlay={() => {
              setIsPlaying(true);
              setError(null);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        )}
      </div>
    </div>
  );
}
