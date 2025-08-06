'use client';

import { useState, useMemo, useEffect, useRef, useCallback, memo, startTransition } from 'react';
import { Artist as ArtistType, Track } from '@/types';
import Album from './Album';
import LazyEra from './LazyEra';
import TrackList from './TrackList';
import VirtualizedTrackList from './VirtualizedTrackList';
import ExportButton from './ExportButton';
import { SheetType } from './SheetNavigation';

interface ArtistProps {
  artist: ArtistType;
  onPlayTrack: (track: Track) => void;
  onTrackInfo: (track: Track) => void;
  docId: string;
  sourceUrl: string;
  sheetType: SheetType;
}

const Artist = memo(function Artist({ artist, onPlayTrack, onTrackInfo, docId, sourceUrl, sheetType }: ArtistProps) {
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
    onTrackInfo?.(track);
  }, [onTrackInfo]);

    // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200); // Reduced from 500ms to 200ms for faster response

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Optimized search with startTransition for responsive UI
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    startTransition(() => {
      setDebouncedSearchQuery(value);
    });
  }, []);

  // Emergency brake for massive datasets - limit search results
  const MAX_SEARCH_RESULTS = 500;
  const MAX_ALL_TRACKS = 1000;

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        startTransition(() => {
          setSearchQuery('');
          setDebouncedSearchQuery('');
        });
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Filter albums and tracks based on debounced search query and sheet type
  const filteredAlbums = useMemo(() => {
    console.log('🔄 Processing albums for sheet type:', sheetType, 'Search:', !!debouncedSearchQuery.trim());
    
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

        // Search in alternate names
        const alternateNamesMatch = track.title?.alternateNames?.some(name =>
          name?.toLowerCase().includes(query)
        ) || false;

        return titleMatch || alternateNamesMatch;
      });

      // Return album only if it has matching tracks
      if (filteredTracks.length > 0) {
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
    let resultCount = 0;
    
    // Search through albums efficiently and stop early if we hit the limit
    for (const album of artist.albums) {
      if (resultCount >= MAX_SEARCH_RESULTS) break;
      
      for (const track of album.tracks) {
        if (resultCount >= MAX_SEARCH_RESULTS) break;
        
        // Skip tracks without proper data
        if (!track || (!track.title?.main && !track.rawName)) {
          continue;
        }

        // Search in track title main name
        const titleMatch = track.title?.main?.toLowerCase().includes(query) || false;

        // Search in alternate names
        const alternateNamesMatch = track.title?.alternateNames?.some(name =>
          name?.toLowerCase().includes(query)
        ) || false;

        if (titleMatch || alternateNamesMatch) {
          allTracks.push({
            ...track,
            albumName: album.name
          });
          resultCount++;
        }
      }
    }

    // Sort tracks by name
    return allTracks.sort((a, b) => 
      (a.title?.main || a.rawName || '').localeCompare(b.title?.main || b.rawName || '')
    );
  }, [artist.albums, debouncedSearchQuery]);

  // Flat list of all tracks for recent view (no era grouping) - LIMITED for performance
  const allTracks = useMemo(() => {
    if (sheetType !== 'recent') {
      return [];
    }
    
    const allTracks: (Track & { albumName: string })[] = [];
    let trackCount = 0;
    
    for (const album of artist.albums) {
      if (trackCount >= MAX_ALL_TRACKS) break;
      
      for (const track of album.tracks) {
        if (trackCount >= MAX_ALL_TRACKS) break;
        
        // Skip tracks without proper data
        if (!track || (!track.title?.main && !track.rawName)) {
          continue;
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
            trackCount++;
          }
        }
      }
    }

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
            onChange={handleSearchChange}
            placeholder="Search for tracks by title or alternate names... (Ctrl+K)"
            className="block w-full pl-10 pr-12 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 shadow-sm transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => {
                startTransition(() => {
                  setSearchQuery('');
                  setDebouncedSearchQuery('');
                });
              }}
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
          <div className="space-y-4">
            {/* Warning for limited results */}
            {searchTracks.length >= MAX_SEARCH_RESULTS && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Showing first {MAX_SEARCH_RESULTS} results
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Try a more specific search term to see different results
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Use virtualized list for large search results (>50 tracks) */}
            {searchTracks.length > 50 ? (
              <VirtualizedTrackList 
                tracks={searchTracks} 
                onPlay={onPlayTrack} 
                onTrackInfo={handleTrackInfo}
                maxHeight={600}
              />
            ) : (
              <TrackList tracks={searchTracks} onPlay={onPlayTrack} onTrackInfo={handleTrackInfo} />
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Results Found</h2>
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              No tracks found matching &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={() => {
                startTransition(() => {
                  setSearchQuery('');
                  setDebouncedSearchQuery('');
                });
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Clear Search
            </button>
          </div>
        )
      ) : sheetType === 'recent' ? (
        // Show flat track list for recent view (no era grouping)
        allTracks.length > 0 ? (
          <div className="space-y-4">
            {/* Warning for limited results */}
            {allTracks.length >= MAX_ALL_TRACKS && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Showing first {MAX_ALL_TRACKS} recent tracks
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Limited for optimal performance
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Always use virtualized list for recent tracks, but disable virtualization for better scrolling */}
            <VirtualizedTrackList 
              tracks={allTracks} 
              onPlay={onPlayTrack} 
              onTrackInfo={handleTrackInfo}
              disableVirtualization={allTracks.length <= 100} // Only virtualize if more than 100 tracks
              maxHeight={allTracks.length <= 100 ? undefined : 600}
            />
          </div>
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
        // Show improved track view for "All Tracks", normal album view for others
        filteredAlbums.length > 0 ? (
          sheetType === 'unreleased' ? (
            <div className="space-y-4 sm:space-y-6">
              {filteredAlbums.map((album, index) => (
                <LazyEra
                  key={album.id || `album-${index}`} 
                  era={album}
                  docId={docId}
                  onPlay={onPlayTrack}
                  onScrollToTrack={handleScrollToTrack}
                  isSearchActive={!!debouncedSearchQuery.trim()}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {filteredAlbums.map((album, index) => (
                <Album 
                  key={album.id || `album-${index}`} 
                  album={album} 
                  onPlay={onPlayTrack}
                  onScrollToTrack={handleScrollToTrack}
                  isSearchActive={!!debouncedSearchQuery.trim()}
                />
              ))}
            </div>
          )
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
});

Artist.displayName = 'Artist';

export default Artist;
