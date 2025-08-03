"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ParsedSpreadsheetData, Track } from "@/types";
import Artist from "@/components/Artist";
import MusicPlayer from "@/components/MusicPlayer";
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
        const url = currentSheet === 'unreleased' 
          ? `/api/parse?docId=${spreadsheetId}`
          : `/api/parse?docId=${spreadsheetId}&sheetType=${currentSheet}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch spreadsheet data");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [spreadsheetId, currentSheet]);

  const handleSheetChange = async (newSheet: SheetType) => {
    if (newSheet === currentSheet) return;
    
    setSheetLoading(true);
    setCurrentSheet(newSheet);
    
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (newSheet === 'unreleased') {
      url.searchParams.delete('sheet');
    } else {
      url.searchParams.set('sheet', newSheet);
    }
    router.replace(url.pathname + url.search);
    
    try {
      const apiUrl = newSheet === 'unreleased' 
        ? `/api/parse?docId=${spreadsheetId}`
        : `/api/parse?docId=${spreadsheetId}&sheetType=${newSheet}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch filtered data");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load filtered data");
    } finally {
      setSheetLoading(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsMusicPlayerVisible(true);
  };
  const handleCloseMusicPlayer = () => {
    setIsMusicPlayerVisible(false);
    setCurrentTrack(null);
  };

  if (loading || sheetLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={sheetLoading}
        />
        <div className="p-8 text-center text-lg">
          {sheetLoading ? 'Filtering tracks...' : 'Loading...'}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={sheetLoading}
        />
        <div className="p-8 text-center text-red-600">Error: {error}</div>
      </div>
    );
  }
  if (!data || !data.artist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <SheetNavigation 
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
          isLoading={sheetLoading}
        />
        <div className="p-8 text-center">No data found for this spreadsheet.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SheetNavigation 
        currentSheet={currentSheet}
        onSheetChange={handleSheetChange}
        isLoading={sheetLoading}
      />
      <Artist 
        artist={data.artist} 
        onPlayTrack={handlePlayTrack}
        docId={spreadsheetId}
        sourceUrl={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
        sheetType={currentSheet}
      />
      <MusicPlayer
        track={currentTrack}
        isVisible={isMusicPlayerVisible}
        onClose={handleCloseMusicPlayer}
      />
    </div>
  );
}
