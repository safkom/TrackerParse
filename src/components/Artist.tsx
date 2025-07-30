'use client';

import { Artist as ArtistType } from '@/types';
import Album from './Album';

interface ArtistProps {
  artist: ArtistType;
  error?: string;
}

export default function Artist({ artist, error }: ArtistProps) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Artist Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          {artist.name}
        </h1>
        <p className="text-gray-600">
          {artist.albums.length} album{artist.albums.length !== 1 ? 's' : ''} • 
          {artist.albums.reduce((total, album) => total + album.tracks.length, 0)} tracks
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Last updated: {new Date(artist.lastUpdated).toLocaleString()}
        </p>
        
        {error && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Albums Grid */}
      {artist.albums.length > 0 ? (
        <div className="space-y-6">
          {artist.albums.map((album) => (
            <Album key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎵</div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Albums Found</h2>
          <p className="text-gray-500">
            This artist doesn't have any albums in the spreadsheet yet.
          </p>
        </div>
      )}
    </div>
  );
}
