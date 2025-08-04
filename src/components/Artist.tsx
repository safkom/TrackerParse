'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Artist as ArtistType, Track } from '@/types';
import Album from './Album';
import TrackList from './TrackList';
import ExportButton from './ExportButton';
import { SheetType } from './SheetNavigation';

interface ArtistProps {
  artist: ArtistType;
  onPlayTrack?: (track: Track) => void;
  docId?: string;
  sourceUrl?: string;
  sheetType?: SheetType;
}

export default function Artist({ artist, onPlayTrack, docId, sourceUrl, sheetType }: ArtistProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle scrolling to a specific track
  const handleScrollToTrack = useCallback((trackId: string) => {
    // Sanitize the track ID for use as a CSS selector
    const sanitizedId = trackId.replace(/[^a-zA-Z0-9-_]/g, '-');
    const element = document.querySelector(`[data-track-id="${sanitizedId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Handle track info/details
  const handleTrackInfo = useCallback((track: Track) => {
    // This would typically open a track details modal
    // For now, we'll just log the track info
    console.log('Track info:', track);
  }, []);

    // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200); // Reduced from 500ms to 200ms for faster response

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Filter albums and tracks based on debounced search query and sheet type
  const filteredAlbums = useMemo(() => {
    let albumsToFilter = artist.albums;

    // Apply sheet type filtering first (only when not searching)
    if (!debouncedSearchQuery.trim()) {
      if (sheetType === 'best') {
        albumsToFilter = artist.albums.map(album => ({
          ...album,
          tracks: album.tracks.filter(track => {
            // Filter for best tracks - tracks marked as special or high quality
            return track.isSpecial || 
                   track.quality?.toLowerCase().includes('og') ||
                   track.quality?.toLowerCase().includes('full') ||
                   track.quality?.toLowerCase().includes('lossless') ||
                   track.quality?.toLowerCase().includes('cd quality');
          })
        })).filter(album => album.tracks.length > 0);
      } else if (sheetType === 'recent') {
        return []; // Use allTracks instead for recent view
      }
      
      return albumsToFilter;
    }

    const query = debouncedSearchQuery.toLowerCase();
    
    return artist.albums.map(album => {
      const filteredTracks = album.tracks.filter(track => {
        // Skip tracks without proper data
        if (!track || (!track.title?.main && !track.rawName)) {
          return false;
        }

        // Search in track title main name
        const titleMatch = track.title?.main?.toLowerCase().includes(query) || false;
        
        // Search in raw name
        const rawNameMatch = track.rawName?.toLowerCase().includes(query) || false;
        
        // Search in alternate names
        const alternateNamesMatch = track.title?.alternateNames?.some(name => 
          name?.toLowerCase().includes(query)
        ) || false;
        
        // Search in features
        const featuresMatch = track.title?.features?.some(feature => 
          feature?.toLowerCase().includes(query)
        ) || false;
        
        // Search in collaborators
        const collaboratorsMatch = track.title?.collaborators?.some(collab => 
          collab?.toLowerCase().includes(query)
        ) || false;
        
        // Search in producers
        const producersMatch = track.title?.producers?.some(producer => 
          producer?.toLowerCase().includes(query)
        ) || false;
        
        // Search in notes
        const notesMatch = track.notes?.toLowerCase().includes(query) || false;
        
        // Search in era
        const eraMatch = track.era?.toLowerCase().includes(query) || false;
        
        return titleMatch || rawNameMatch || alternateNamesMatch || featuresMatch || 
               collaboratorsMatch || producersMatch || notesMatch || eraMatch;
      });

      // Return album only if it has matching tracks or if the album name matches
      if (filteredTracks.length > 0 || album.name.toLowerCase().includes(query)) {
        return {
          ...album,
          tracks: filteredTracks
        };
      }
      
      return null;
    }).filter(album => album !== null);
  }, [artist.albums, debouncedSearchQuery, sheetType]);

  // Flat list of all matching tracks for search display (no era grouping)
  const searchTracks = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return [];
    }

    const query = debouncedSearchQuery.toLowerCase();
    const allTracks: (Track & { albumName: string })[] = [];
    
    artist.albums.forEach(album => {
      album.tracks.forEach(track => {
        // Skip tracks without proper data
        if (!track || (!track.title?.main && !track.rawName)) {
          return;
        }

        // Search in track title main name
        const titleMatch = track.title?.main?.toLowerCase().includes(query) || false;
        
        // Search in raw name
        const rawNameMatch = track.rawName?.toLowerCase().includes(query) || false;
        
        // Search in alternate names
        const alternateNamesMatch = track.title?.alternateNames?.some(name => 
          name?.toLowerCase().includes(query)
        ) || false;
        
        // Search in features
        const featuresMatch = track.title?.features?.some(feature => 
          feature?.toLowerCase().includes(query)
        ) || false;
        
        // Search in collaborators
        const collaboratorsMatch = track.title?.collaborators?.some(collab => 
          collab?.toLowerCase().includes(query)
        ) || false;
        
        // Search in producers
        const producersMatch = track.title?.producers?.some(producer => 
          producer?.toLowerCase().includes(query)
        ) || false;
        
        // Search in notes
        const notesMatch = track.notes?.toLowerCase().includes(query) || false;
        
        // Search in era
        const eraMatch = track.era?.toLowerCase().includes(query) || false;
        
        if (titleMatch || rawNameMatch || alternateNamesMatch || featuresMatch || 
            collaboratorsMatch || producersMatch || notesMatch || eraMatch) {
          allTracks.push({
            ...track,
            albumName: album.name
          });
        }
      });
    });

    // Sort tracks by name
    return allTracks.sort((a, b) => 
      (a.title?.main || a.rawName || '').localeCompare(b.title?.main || b.rawName || '')
    );
  }, [artist.albums, debouncedSearchQuery]);

  // Flat list of all tracks for recent view (no era grouping)
  const allTracks = useMemo(() => {
    if (sheetType !== 'recent') {
      return [];
    }
    
    const allTracks: (Track & { albumName: string })[] = [];
    artist.albums.forEach(album => {
      album.tracks.forEach(track => {
        // Skip tracks without proper data
        if (!track || (!track.title?.main && !track.rawName)) {
          return;
        }

        // Filter for recent tracks (tracks with dates in the last 6 months)
        const hasRecentDate = track.leakDate || track.fileDate;
        if (hasRecentDate) {
          const trackDate = new Date(hasRecentDate);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          
          if (trackDate >= sixMonthsAgo) {
            allTracks.push({
              ...track,
              albumName: album.name
            });
          }
        }
      });
    });

    // Sort by date (newest first)
    return allTracks.sort((a, b) => {
      const dateA = new Date(a.leakDate || a.fileDate || 0);
      const dateB = new Date(b.leakDate || b.fileDate || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [artist.albums, sheetType]);

  const totalFilteredTracks = filteredAlbums.reduce((total, album) => total + album.tracks.length, 0);
  return (
    <div className="w-full px-2 sm:px-6 py-3 sm:py-6">
      {/* Artist Header - Reduced spacing */}
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-2">
          {artist.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {debouncedSearchQuery ? (
            <>
              {filteredAlbums.length} era{filteredAlbums.length !== 1 ? 's' : ''} •{' '}
              {totalFilteredTracks} track{totalFilteredTracks !== 1 ? 's' : ''} found
            </>
          ) : sheetType === 'recent' ? (
            <>
              {allTracks.length} recent track{allTracks.length !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              {filteredAlbums.length} era{filteredAlbums.length !== 1 ? 's' : ''} •{' '}
              {totalFilteredTracks} track{totalFilteredTracks !== 1 ? 's' : ''}
            </>
          )}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Last updated: {new Date(artist.lastUpdated).toLocaleString()}
        </p>
        
        {/* Export Button */}
        {docId && sourceUrl && (
          <div className="mt-3 sm:mt-4">
            <ExportButton 
              artist={artist}
              docId={docId}
              sourceUrl={sourceUrl}
              variant="outline"
              size="md"
            />
          </div>
        )}
      </div>

      {/* Search Bar - Reduced spacing */}
      <div className="mb-4 sm:mb-6 max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for tracks by title, alternate names, or notes... (Ctrl+K)"
            className="block w-full pl-10 pr-12 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 shadow-sm transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="text-gray-500 dark:text-gray-400">
              {totalFilteredTracks === 0 ? 'No tracks found' : `Found ${totalFilteredTracks} track${totalFilteredTracks !== 1 ? 's' : ''}`}
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Show All
            </button>
          </div>
        )}
      </div>

      {/* Search Results, Recent View, or Albums Grid */}
      {debouncedSearchQuery.trim() ? (
        // Show flat track list when searching
        searchTracks.length > 0 ? (
          <TrackList tracks={searchTracks} onPlay={onPlayTrack} onTrackInfo={handleTrackInfo} />
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Results Found</h2>
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              No tracks found matching &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Clear Search
            </button>
          </div>
        )
      ) : sheetType === 'recent' ? (
        // Show flat track list for recent view (no era grouping)
        allTracks.length > 0 ? (
          <TrackList tracks={allTracks} onPlay={onPlayTrack} onTrackInfo={handleTrackInfo} />
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🆕</div>
            <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Recent Tracks</h2>
            <p className="text-gray-500 dark:text-gray-500">
              No tracks found in the recent timeframe.
            </p>
          </div>
        )
      ) : (
        // Show normal album view when not searching and not recent view
        filteredAlbums.length > 0 ? (
          <div className="space-y-4 sm:space-y-6">
            {filteredAlbums.map((album, index) => (
              <Album 
                key={album.id || `album-${index}`} 
                album={album} 
                onPlay={onPlayTrack}
                onScrollToTrack={handleScrollToTrack}
                isSearchActive={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🎵</div>
            <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Albums Found</h2>
            <p className="text-gray-500 dark:text-gray-500">
              This artist doesn&apos;t have any albums in the spreadsheet yet.
            </p>
          </div>
        )
      )}
    </div>
  );
}
