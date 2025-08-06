'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ParsedSpreadsheetData, Track } from '@/types';
import TrackList from '@/components/TrackList';
import MusicPlayer from '@/components/MusicPlayer';
import Navigation from '@/components/Navigation';

export default function RecentTracks() {
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

    const fetchRecentTracks = async () => {
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

    fetchRecentTracks();
  }, [docId, router]);

  // Get tracks sorted by leak date (most recent first)
  const recentTracks = data?.artist.albums.flatMap(album => 
    album.tracks
      .filter(track => track.leakDate && track.leakDate.trim() !== '')
      .map(track => ({ ...track, albumName: album.name }))
  ).sort((a, b) => {
    // Sort by leak date descending (most recent first)
    if (!a.leakDate || !b.leakDate) return 0;
    return new Date(b.leakDate).getTime() - new Date(a.leakDate).getTime();
  }).slice(0, 50) || []; // Limit to 50 most recent

  const handleTrackPlay = (track: Track) => {
    setCurrentTrack(track);
    setIsMusicPlayerVisible(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading recent tracks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-blue-900/50">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🕐 Recently Leaked
          </h1>
          <p className="text-blue-700 dark:text-blue-300">
            The latest tracks to surface, sorted by leak date.
          </p>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing the {recentTracks.length} most recent tracks
          </div>
        </div>

        {recentTracks.length > 0 ? (
          <TrackList 
            tracks={recentTracks}
            onPlay={handleTrackPlay}
          />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-600 dark:text-gray-400">No recent tracks found</p>
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
