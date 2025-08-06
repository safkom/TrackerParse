'use client';

import { useState, useCallback, useEffect } from 'react';
import { Album as AlbumType, Track as TrackType } from '@/types';
import ImprovedAlbum from './ImprovedAlbum';

interface LazyEraProps {
  era: AlbumType;
  docId: string;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  isSearchActive?: boolean;
}

export default function LazyEra({ era, docId, onPlay, onScrollToTrack, isSearchActive = false }: LazyEraProps) {
  const [eraData, setEraData] = useState<AlbumType>(era);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isSearchActive);
  const [hasLoadedTracks, setHasLoadedTracks] = useState(era.tracks.length > 0);

  // Auto-expand when search is active
  useEffect(() => {
    if (isSearchActive) {
      setIsExpanded(true);
    }
  }, [isSearchActive]);

  // Load tracks when era is expanded
  const handleExpansion = useCallback(async (expanded: boolean) => {
    setIsExpanded(expanded);
    
    if (expanded && !hasLoadedTracks && !isLoading) {
      setIsLoading(true);
      try {
        console.log(`🎵 Loading tracks for era: ${era.name}`);
        
        // Fetch full data from parse endpoint
        const response = await fetch(`/api/parse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleDocsUrl: `https://docs.google.com/spreadsheets/d/${docId}/edit`
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load era details: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Find the specific album/era from the full data
        const fullEra = result.artist.albums.find((album: AlbumType) => album.name === era.name);
        
        if (fullEra) {
          setEraData(fullEra);
          setHasLoadedTracks(true);
          console.log(`✅ Loaded ${fullEra.tracks.length} tracks for era: ${era.name}`);
        } else {
          console.warn(`❌ Era "${era.name}" not found in full data`);
        }
        
      } catch (error) {
        console.error(`❌ Error loading era ${era.name}:`, error);
        // Keep the original era data on error
      } finally {
        setIsLoading(false);
      }
    }
  }, [era.name, era.id, docId, hasLoadedTracks, isLoading]);

  return (
    <div className="relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg z-10 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Loading tracks...</span>
          </div>
        </div>
      )}
      
      <ImprovedAlbum 
        album={eraData}
        onPlay={onPlay}
        onScrollToTrack={onScrollToTrack}
        isSearchActive={isSearchActive}
        onExpansionChange={handleExpansion}
        showTrackCount={!hasLoadedTracks}
      />
    </div>
  );
}
