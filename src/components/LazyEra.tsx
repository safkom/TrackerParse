'use client';

import { useState, useCallback, useEffect } from 'react';
import { Album as AlbumType, Track as TrackType } from '@/types';
import ImprovedAlbum from './ImprovedAlbum';

interface LazyEraProps {
  era: AlbumType;
  docId: string;
  onPlay?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
  onTrackInfo?: (track: TrackType) => void;
  isSearchActive?: boolean;
  sheetType?: string; // Add sheetType prop
}

// Cache for era data to avoid re-fetching
const eraDataCache = new Map<string, AlbumType>();

export default function LazyEra({ era, docId, onPlay, onScrollToTrack, onTrackInfo, isSearchActive = false, sheetType }: LazyEraProps) {
  const [eraData, setEraData] = useState<AlbumType>(era);
  const [isExpanded, setIsExpanded] = useState(isSearchActive);
  const [hasLoadedTracks, setHasLoadedTracks] = useState(era.tracks.length > 0);

  const cacheKey = `${docId}-${era.name}`;

  // Auto-expand when search is active
  useEffect(() => {
    if (isSearchActive) {
      setIsExpanded(true);
    }
  }, [isSearchActive]);

  // Load tracks when era is expanded - now simply uses existing data
  const loadEraData = useCallback(() => {
    // Don't cache or use cached data if tracks are empty - wait for full data
    if (era.tracks.length === 0) {
      console.log(`⏳ Waiting for track data for era: ${era.name}`);
      setEraData(era);
      setHasLoadedTracks(false);
      return;
    }

    // Check cache only if current era has tracks
    if (eraDataCache.has(cacheKey) && era.tracks.length > 0) {
      const cachedData = eraDataCache.get(cacheKey)!;
      // Only use cache if cached data also has tracks
      if (cachedData.tracks.length > 0) {
        setEraData(cachedData);
        setHasLoadedTracks(true);
        console.log(`🎯 Using cached data for era: ${era.name} (${cachedData.tracks.length} tracks)`);
        return;
      }
    }

    // Use the era data with tracks
    console.log(`📦 Using track data for era: ${era.name} (${era.tracks.length} tracks)`);
    
    // Only cache if we have actual tracks
    if (era.tracks.length > 0) {
      eraDataCache.set(cacheKey, era);
    }
    
    setEraData(era);
    setHasLoadedTracks(era.tracks.length > 0);
  }, [cacheKey, era]);

  // Handle expansion changes
  const handleExpansion = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
    
    if (expanded && (!hasLoadedTracks || era.tracks.length > eraData.tracks.length)) {
      loadEraData(); // Load data when user manually expands or when new data is available
    }
  }, [loadEraData, hasLoadedTracks, era.tracks.length, eraData.tracks.length]);

  // Update data when era prop changes (e.g., when full data loads)
  useEffect(() => {
    // If era has more tracks than current eraData, update immediately
    if (era.tracks.length > eraData.tracks.length) {
      loadEraData();
    }
  }, [era.tracks.length, eraData.tracks.length, loadEraData]);

  // Load data immediately on mount if era has tracks
  useEffect(() => {
    if (era.tracks.length > 0 && !hasLoadedTracks) {
      loadEraData();
    }
  }, [era.tracks.length, hasLoadedTracks, loadEraData]);

  return (
    <ImprovedAlbum 
      album={eraData}
      onPlay={onPlay}
      onTrackInfo={onTrackInfo}
      isSearchActive={isSearchActive}
      onExpansionChange={handleExpansion}
      showTrackCount={!hasLoadedTracks}
      sheetType={sheetType}
    />
  );
}
