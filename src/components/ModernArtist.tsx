'use client';

import React, { useMemo, useState } from 'react';
import { Artist as ArtistType, Track as TrackType } from '@/types';
import ModernAlbum from './ModernAlbum';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';

interface ModernArtistProps {
  artist: ArtistType;
  onPlayTrack?: (track: TrackType) => void;
  onTrackInfo?: (track: TrackType) => void;
  currentTrack?: TrackType | null;
}

const ModernArtist: React.FC<ModernArtistProps> = ({
  artist,
  onPlayTrack,
  onTrackInfo,
  currentTrack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(false);

  // Filter albums based on search query
  const { filteredAlbums, totalTracks, totalPlayable } = useMemo(() => {
    if (!searchQuery.trim()) {
      const total = artist.albums.reduce((sum, album) => sum + album.tracks.length, 0);
      const playable = artist.albums.reduce((sum, album) => 
        sum + album.tracks.filter(track => {
          const quality = track.quality?.toLowerCase() || '';
          const available = track.availableLength?.toLowerCase() || '';
          return !quality.includes('not available') && !available.includes('not available') && track.links && track.links.length > 0;
        }).length, 0
      );
      return { 
        filteredAlbums: artist.albums, 
        totalTracks: total,
        totalPlayable: playable
      };
    }

    const query = searchQuery.toLowerCase();
    const filtered = artist.albums.map(album => {
      // Check if album name matches
      const albumMatches = album.name.toLowerCase().includes(query) ||
                          (album.alternateNames && album.alternateNames.some(name => 
                            name.toLowerCase().includes(query)
                          ));

      // Filter tracks that match the query
      const matchingTracks = album.tracks.filter(track => {
        const title = track.title?.main?.toLowerCase() || track.rawName?.toLowerCase() || '';
        const notes = track.notes?.toLowerCase() || '';
        const quality = track.quality?.toLowerCase() || '';
        const availability = track.availableLength?.toLowerCase() || '';
        
        // Check features, producers, collaborators
        const features = track.title?.features?.join(' ').toLowerCase() || '';
        const producers = track.title?.producers?.join(' ').toLowerCase() || '';
        const collaborators = track.title?.collaborators?.join(' ').toLowerCase() || '';
        const altNames = track.title?.alternateNames?.join(' ').toLowerCase() || '';
        
        return title.includes(query) ||
               notes.includes(query) ||
               quality.includes(query) ||
               availability.includes(query) ||
               features.includes(query) ||
               producers.includes(query) ||
               collaborators.includes(query) ||
               altNames.includes(query);
      });

      // Include album if it matches or has matching tracks
      if (albumMatches || matchingTracks.length > 0) {
        return {
          ...album,
          tracks: albumMatches ? album.tracks : matchingTracks
        };
      }
      return null;
    }).filter(Boolean) as typeof artist.albums;

    const total = filtered.reduce((sum, album) => sum + album.tracks.length, 0);
    const playable = filtered.reduce((sum, album) => 
      sum + album.tracks.filter(track => {
        const quality = track.quality?.toLowerCase() || '';
        const available = track.availableLength?.toLowerCase() || '';
        return !quality.includes('not available') && !available.includes('not available') && track.links && track.links.length > 0;
      }).length, 0
    );

    return { 
      filteredAlbums: filtered,
      totalTracks: total,
      totalPlayable: playable
    };
  }, [artist, searchQuery]);

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Artist Header */}
      <div className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {artist.name}
          </h1>
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <MusicalNoteIcon className="w-4 h-4" />
              <span>{artist.albums.length} eras</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>{totalTracks} tracks total</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>{totalPlayable} playable</span>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tracks, artists, producers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={handleSearchClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Found {totalTracks} tracks across {filteredAlbums.length} eras matching &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Albums/Eras */}
      <div className="space-y-6">
        {filteredAlbums.map((album, index) => (
          <ModernAlbum
            key={album.id || index}
            album={album}
            onPlay={onPlayTrack}
            onScrollToTrack={(trackId) => {
              // Find the track by ID and call onTrackInfo
              const track = album.tracks.find(t => t.id === trackId || t.rawName === trackId);
              if (track && onTrackInfo) {
                onTrackInfo(track);
              }
            }}
            isSearchActive={!!searchQuery || expandAll}
            currentTrack={currentTrack}
          />
        ))}
      </div>

      {filteredAlbums.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No results found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your search terms or clearing the search
          </p>
          <button
            onClick={handleSearchClear}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};

export default ModernArtist;
