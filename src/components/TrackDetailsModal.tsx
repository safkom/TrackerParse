'use client';

import { Track as TrackType } from '@/types';

interface TrackDetailsModalProps {
  track: TrackType;
  onClose: () => void;
  onPlay?: (track: TrackType) => void;
}

export default function TrackDetailsModal({ track, onClose, onPlay }: TrackDetailsModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {track.title?.main || track.rawName}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Track Information */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Track Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {track.era && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Era:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{track.era}</span>
                  </div>
                )}
                {track.trackLength && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Length:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{track.trackLength}</span>
                  </div>
                )}
                {track.quality && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Quality:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{track.quality}</span>
                  </div>
                )}
                {track.availableLength && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Available:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{track.availableLength}</span>
                  </div>
                )}
                {track.fileDate && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">File Date:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{track.fileDate}</span>
                  </div>
                )}
                {track.leakDate && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Leak Date:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{track.leakDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Features and Collaborators */}
            {(track.title?.features?.length > 0 || track.title?.collaborators?.length > 0 || track.title?.producers?.length > 0) && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Credits</h4>
                <div className="space-y-2 text-sm">
                  {track.title?.features?.length > 0 && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Features:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {track.title.features.join(', ')}
                      </span>
                    </div>
                  )}
                  {track.title?.collaborators?.length > 0 && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Collaborators:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {track.title.collaborators.join(', ')}
                      </span>
                    </div>
                  )}
                  {track.title?.producers?.length > 0 && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Producers:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {track.title.producers.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {track.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h4>
                <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  {track.notes}
                </div>
              </div>
            )}

            {/* Links */}
            {track.links?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Links</h4>
                <div className="space-y-2">
                  {track.links.map((link, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {link.label || link.platform || 'Link'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                            {link.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {link.url}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        {onPlay && (
                          <button
                            onClick={() => onPlay(track)}
                            className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            title="Play"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                          title="Open link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
