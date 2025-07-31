'use client';

import React, { useState, useEffect } from 'react';
import Portal from './Portal';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadataUrl: string;
  trackName: string;
}

interface ParsedMetadata {
  fileFormat: Record<string, string>;
  commonInfo: Record<string, string>;
}

export default function MetadataModal({ isOpen, onClose, metadataUrl, trackName }: MetadataModalProps) {
  const [metadata, setMetadata] = useState<ParsedMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && metadataUrl) {
      setLoading(true);
      setError(null);
      setMetadata(null);

      // Try to fetch metadata through a proxy to avoid CORS issues
      fetch(`/api/proxy-metadata?url=${encodeURIComponent(metadataUrl)}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.text();
        })
        .then(data => {
          console.log('Raw metadata:', data);
          
          // Parse the metadata text
          const parsed = parseMetadata(data);
          setMetadata(parsed);
        })
        .catch((err) => {
          console.error('Error fetching metadata:', err);
          setError(err.message || 'Failed to load metadata');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, metadataUrl]);

  // Simple metadata parser
  const parseMetadata = (text: string): ParsedMetadata => {
    const lines = text.split('\n').filter(line => line.trim());
    const fileFormat: Record<string, string> = {};
    const commonInfo: Record<string, string> = {};
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Detect sections
      if (trimmedLine.match(/^\[.*\]$/)) {
        currentSection = trimmedLine.slice(1, -1).toLowerCase();
        continue;
      }
      
      // Parse key-value pairs
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.slice(0, colonIndex).trim();
        const value = trimmedLine.slice(colonIndex + 1).trim();
        
        if (currentSection === 'format' || key.toLowerCase().includes('format') || 
            key.toLowerCase().includes('codec') || key.toLowerCase().includes('bitrate') ||
            key.toLowerCase().includes('sample') || key.toLowerCase().includes('channels') ||
            key.toLowerCase().includes('duration') || key.toLowerCase().includes('size')) {
          fileFormat[key] = value;
        } else {
          commonInfo[key] = value;
        }
      }
    }
    
    return { fileFormat, commonInfo };
  };

  const formatValue = (value: string): string => {
    return value === 'unknown' ? 'Unknown' : value || 'N/A';
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 10000 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <div 
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Track Metadata
            </h2>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
            {loading && (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">Loading metadata...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-6">
                <div className="text-red-600 dark:text-red-400 mb-2">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium text-sm">Failed to load metadata</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{error}</p>
              </div>
            )}

            {metadata && (
              <div className="space-y-4">
                {/* Track Name */}
                <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Track</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{trackName}</p>
                </div>

                {/* File Format Info */}
                {Object.keys(metadata.fileFormat).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      File Format
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="space-y-2">
                        {Object.entries(metadata.fileFormat).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center text-xs">
                            <span className="font-medium text-gray-600 dark:text-gray-400 uppercase">
                              {key}:
                            </span>
                            <span className="text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded">
                              {formatValue(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-700">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
