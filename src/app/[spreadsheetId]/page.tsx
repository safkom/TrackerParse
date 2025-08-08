"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ParsedSpreadsheetData, Track, Album } from "@/types";
import Artist from "@/components/Artist";
import MusicPlayer from "@/components/MusicPlayer";
import TrackDetailPage from "@/components/TrackDetailPage";
import SheetNavigation, { SheetType } from "@/components/SheetNavigation";

export default function SpreadsheetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const spreadsheetId = params.spreadsheetId as string;
  const [data, setData] = useState<ParsedSpreadsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(false);
  const [infoTrack, setInfoTrack] = useState<Track | null>(null);
  const [currentSheet, setCurrentSheet] = useState<SheetType>('unreleased');

  // Get sheet type from URL params
  useEffect(() => {
    const sheetParam = searchParams.get('sheet') as SheetType;
    if (sheetParam && ['unreleased', 'best', 'recent'].includes(sheetParam)) {
      setCurrentSheet(sheetParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!spreadsheetId) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use only Google Sheets API for reliable data parsing
        console.log('🚀 Fetching data using Google Sheets API...', { spreadsheetId });
        const response = await fetch(`/api/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            googleDocsUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || "Failed to fetch spreadsheet data");
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
        
        console.log('✅ Data loaded successfully:', {
          requestId: response.headers.get('X-Request-ID'),
          name: result.artist.name,
          eras: result.artist.albums.length,
          totalTracks: result.artist.albums.reduce((sum: number, album: Album) => sum + album.tracks.length, 0)
        });
        
      } catch (err) {
        console.error('❌ Failed to load data:', err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setLoading(false);
      }
    };
    fetchData();
  }, [spreadsheetId]);

  const handleSheetChange = async (newSheet: SheetType) => {
    if (newSheet === currentSheet) return;
    
    setCurrentSheet(newSheet);
    
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (newSheet === 'unreleased') {
      url.searchParams.delete('sheet');
    } else {
      url.searchParams.set('sheet', newSheet);
    }
    router.replace(url.pathname + url.search);
    
    // No need to make API call - filtering is done client-side in Artist component
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsMusicPlayerVisible(true);
  };
  const handleCloseMusicPlayer = () => {
    setIsMusicPlayerVisible(false);
    setCurrentTrack(null);
  };

  const handleTrackInfo = (track: Track) => {
    setInfoTrack(track);
  };
  const handleCloseInfo = () => {
    setInfoTrack(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={loading}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500 mx-auto mb-6"></div>
            <p className="text-slate-300 text-lg font-medium">
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={loading}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data || !data.artist) {
    return (
      <div className="min-h-screen bg-slate-900">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={loading}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="text-slate-500 text-6xl mb-4">📭</div>
            <p className="text-slate-400 text-lg">No data found for this spreadsheet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <SheetNavigation 
        currentSheet={currentSheet}
        onSheetChange={handleSheetChange}
        isLoading={loading}
      />
      <div className="flex-1"> {/* Added flex wrapper to allow Artist content to expand */}
        <Artist
          artist={data.artist}
          onPlayTrack={handlePlayTrack}
          onTrackInfo={handleTrackInfo}
          docId={spreadsheetId}
          sourceUrl={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
          sheetType={currentSheet}
        />
      </div>
      <MusicPlayer
        track={currentTrack}
        isVisible={isMusicPlayerVisible}
        onClose={handleCloseMusicPlayer}
        onInfo={handleTrackInfo}
      />
      {infoTrack && (
        <TrackDetailPage
          track={infoTrack}
          onClose={handleCloseInfo}
          onPlay={handlePlayTrack}
        />
      )}
    </div>
  );
}
