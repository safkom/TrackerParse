'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ParsedSpreadsheetData, Track } from '@/types';
import TrackList from '@/components/TrackList';
import MusicPlayer from '@/components/MusicPlayer';
import Navigation from '@/components/Navigation';

export default function BestTracks() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('docId');
  
  const [data, setData] = useState<ParsedSpreadsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(false);

  useEffect(() => {
    if (!docId) {
      router.push('/');
      return;
    }

    const fetchBestTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/parse?docId=${docId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch spreadsheet data");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBestTracks();
  }, [docId, router]);

  // Filter for special tracks (trophy and star emojis) and wanted tracks (medals)
  const bestTracks = data?.artist.albums.flatMap(album => 
    album.tracks
      .filter(track => 
        (track.isSpecial && (track.specialType === '🏆' || track.specialType === '✨')) ||
        (track.isWanted && track.wantedType)
      )
      .map(track => ({ ...track, albumName: album.name }))
  ) || [];

  const handleTrackPlay = (track: Track) => {
    setCurrentTrack(track);
    setIsMusicPlayerVisible(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading best tracks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-100 dark:from-gray-900 dark:to-purple-900/50">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏆 Best & Wanted
          </h1>
          <p className="text-purple-700 dark:text-purple-300">
            A curated list of the most special and sought-after tracks.
          </p>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {bestTracks.length} tracks found
          </div>
        </div>

        {bestTracks.length > 0 ? (
          <TrackList 
            tracks={bestTracks}
            onPlay={handleTrackPlay}
          />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600 dark:text-gray-400">No special tracks found</p>
          </div>
        )}
      </div>

      {isMusicPlayerVisible && currentTrack && (
        <MusicPlayer
          track={currentTrack}
          isVisible={isMusicPlayerVisible}
          onClose={() => setIsMusicPlayerVisible(false)}
        />
      )}
    </div>
  );
}
