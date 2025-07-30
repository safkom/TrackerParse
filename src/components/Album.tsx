'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Album as AlbumType } from '@/types';
import Track from './Track';

interface AlbumProps {
  album: AlbumType;
}

export default function Album({ album }: AlbumProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-lg overflow-hidden">
      {/* Album Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start space-x-4">
          {/* Album Picture */}
          <div className="flex-shrink-0">
            <Image
              src={album.picture}
              alt={album.name}
              width={80}
              height={80}
              className="w-20 h-20 rounded-lg object-cover bg-gray-300"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-album.jpg';
              }}
            />
          </div>

          {/* Album Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 truncate">
                {album.name}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  {album.tracks.length} tracks
                </span>
                <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {album.description && (
              <p className="text-gray-600 mt-2 text-sm">
                {album.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tracks List */}
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="border-t border-gray-200 pt-4">
            {album.tracks.length > 0 ? (
              <div className="space-y-4">
                {album.tracks.map((track, index) => (
                  <div key={index} className="pl-4 border-l-2 border-gray-300">
                    <Track track={track} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No tracks found in this album</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
