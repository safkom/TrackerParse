'use client';

import React, { useState, useMemo } from 'react';
import { Track as TrackType } from '@/types';
import Modal from './Modal';
import { TrackTitle } from './TrackTitle';
import QualityTag from './QualityTag';
import AvailabilityTag from './AvailabilityTag';
import { 
  PlayIcon as PlayIconOutline, 
  LinkIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid';
import { formatTrackInfo, getPlayableSource, hasPlayableSource } from '@/utils/trackFormatter';

interface ModernTrackDetailProps {
  track: TrackType;
  onClose: () => void;
  onPlay?: (track: TrackType) => void;
  isPlaying?: boolean;
}

const ModernTrackDetail: React.FC<ModernTrackDetailProps> = ({ 
  track, 
  onClose, 
  onPlay,
  isPlaying = false 
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'links' | 'notes'>('info');
  
  const trackInfo = useMemo(() => formatTrackInfo(track), [track]);
  const playableSource = useMemo(() => getPlayableSource(track), [track]);
  const canPlay = hasPlayableSource(track);

  const handlePlayClick = () => {
    if (canPlay && onPlay) {
      onPlay(track);
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getLinkPlatform = (url: string): { name: string; icon: string } => {
    if (url.includes('pillowcase') || url.includes('pillows')) return { name: 'Pillowcase', icon: '📁' };
    if (url.includes('froste.lol')) return { name: 'Froste', icon: '🎵' };
    if (url.includes('youtube.com') || url.includes('youtu.be')) return { name: 'YouTube', icon: '▶️' };
    if (url.includes('soundcloud.com')) return { name: 'SoundCloud', icon: '🔊' };
    if (url.includes('spotify.com')) return { name: 'Spotify', icon: '🎶' };
    if (url.includes('apple.com')) return { name: 'Apple Music', icon: '🍎' };
    if (url.includes('twitter.com') || url.includes('x.com')) return { name: 'Twitter/X', icon: '🐦' };
    if (url.includes('instagram.com')) return { name: 'Instagram', icon: '📷' };
    if (url.includes('facebook.com')) return { name: 'Facebook', icon: '👥' };
    return { name: 'External Link', icon: '🔗' };
  };

  const tabs = [
    { id: 'info' as const, label: 'Info', icon: MusicalNoteIcon },
    { id: 'links' as const, label: 'Links', icon: LinkIcon, count: track.links?.length || 0 },
    { id: 'notes' as const, label: 'Notes', icon: DocumentTextIcon }
  ];

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      maxWidth="2xl"
      closeOnBackdropClick={true}
    >
      <div className="bg-white dark:bg-gray-900">
        {/* Header with play button */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            {/* Large Play Button */}
            <button
              onClick={handlePlayClick}
              disabled={!canPlay}
              className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                canPlay
                  ? 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 shadow-lg active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
              title={canPlay ? 'Play track' : 'No playable source available'}
            >
              {isPlaying ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-1.5 h-5 bg-white mr-1 animate-pulse"></div>
                  <div className="w-1.5 h-5 bg-white animate-pulse animation-delay-150"></div>
                </div>
              ) : canPlay ? (
                <PlayIconSolid className="w-6 h-6 ml-1" />
              ) : (
                <MusicalNoteIcon className="w-6 h-6" />
              )}
            </button>

            {/* Track Title and Basic Info */}
            <div className="flex-1 min-w-0">
              <TrackTitle 
                track={track} 
                showDetails={true}
                className="mb-3"
              />
              
              {/* Quality and Availability */}
              <div className="flex flex-wrap items-center gap-2">
                <QualityTag quality={track.quality || ''} />
                <AvailabilityTag availability={track.availableLength || ''} />
                
                {track.trackLength && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">
                    <ClockIcon className="w-4 h-4" />
                    <span>{track.trackLength}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-6 sm:space-x-8 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors touch-manipulation whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {'count' in tab && typeof tab.count === 'number' && tab.count > 0 && (
                    <span className="ml-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {track.fileDate && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">File Date</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{track.fileDate}</div>
                    </div>
                  </div>
                )}
                
                {track.leakDate && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Leak Date</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{track.leakDate}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Special Indicators */}
              <div className="flex flex-wrap gap-2">
                {track.isSpecial && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {track.specialType} Special Track
                  </span>
                )}
                {track.isWanted && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    🎯 Wanted
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-3">
              {track.links && track.links.length > 0 ? (
                track.links.map((link, index) => {
                  const url = typeof link === 'string' ? link : link.url;
                  const platform = getLinkPlatform(url);
                  const isPlayable = url === playableSource?.url;
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 sm:p-3 rounded-lg border transition-colors touch-manipulation ${
                        isPlayable 
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-lg">{platform.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {platform.name}
                            {isPlayable && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                Playable
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {url}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => openLink(url)}
                        className="flex-shrink-0 p-3 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-target touch-manipulation focus-ring"
                        title="Open link"
                        aria-label={`Open ${platform.name} link`}
                      >
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <LinkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No links available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              {track.notes ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {track.notes}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notes available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ModernTrackDetail;
