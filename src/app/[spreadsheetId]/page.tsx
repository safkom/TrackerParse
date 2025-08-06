"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ParsedSpreadsheetData, Track } from "@/types";
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
  const [sheetLoading, setSheetLoading] = useState(false);

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
        // First, fetch only metadata for fast initial load
        console.log('🚀 Fetching metadata for fast initial load...');
        const metadataResponse = await fetch(`/api/parse-metadata?docId=${spreadsheetId}`);
        if (!metadataResponse.ok) {
          throw new Error("Failed to fetch spreadsheet metadata");
        }
        const metadataResult = await metadataResponse.json();
        
        // Set initial data with metadata only
        setData(metadataResult);
        setLoading(false);
        
        console.log('✅ Metadata loaded successfully:', {
          name: metadataResult.artist.name,
          eras: metadataResult.artist.albums.length,
          totalTracks: metadataResult.artist.albums.reduce((sum: number, album: any) => sum + (album.metadata?.trackCount || 0), 0)
        });
        
      } catch (err) {
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

  if (loading || sheetLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-slate-950 dark:via-purple-950 dark:to-fuchsia-950">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={sheetLoading}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-6"></div>
            <p className="text-purple-700 dark:text-purple-300 text-lg font-medium">
              {sheetLoading ? 'Filtering tracks...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-slate-950 dark:via-purple-950 dark:to-fuchsia-950">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={sheetLoading}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400 text-lg">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data || !data.artist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-slate-950 dark:via-purple-950 dark:to-fuchsia-950">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={sheetLoading}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="text-gray-500 text-6xl mb-4">📭</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">No data found for this spreadsheet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-slate-950 dark:via-purple-950 dark:to-fuchsia-950">
      <SheetNavigation 
        currentSheet={currentSheet}
        onSheetChange={handleSheetChange}
        isLoading={sheetLoading}
      />
      <Artist
        artist={data.artist}
        onPlayTrack={handlePlayTrack}
        onTrackInfo={handleTrackInfo}
        docId={spreadsheetId}
        sourceUrl={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
        sheetType={currentSheet}
      />
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
