'use client';

import { useState, useEffect, useCallback, startTransition, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import GoogleDocsForm from '@/components/GoogleDocsForm';
import ModernArtist from '@/components/ModernArtist';
import MusicPlayer from '@/components/MusicPlayer';
import SheetNavigation, { SheetType } from '@/components/SheetNavigation';
import { Artist as ArtistType, ParsedSpreadsheetData, Track } from '@/types';

export default function Home() {
  const [artist, setArtist] = useState<ArtistType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(false);
  const [currentSheetType, setCurrentSheetType] = useState<SheetType>('unreleased');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string>('');
  const router = useRouter();

  // Use deferred value for better performance on large datasets
  const deferredArtist = useDeferredValue(artist);

  // ...existing code for effects, reset, etc...
  const updateNavigationState = (hasData: boolean) => {
    const event = new CustomEvent('trackerDataChange', {
      detail: { hasData }
    });
    window.dispatchEvent(event);
  };

  const handleResetApp = useCallback(() => {
    startTransition(() => {
      setArtist(null);
      setError(null);
      setCurrentTrack(null);
      setIsMusicPlayerVisible(false);
      setLoading(false);
      setCurrentUrl(null);
      setCurrentDocId('');
    });
    try {
      localStorage.removeItem('trackerData');
      Object.keys(localStorage).forEach(key => {
        if (key.includes('tracker') || key.includes('cache')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    updateNavigationState(false);
  }, []);

  useEffect(() => {
    setError(null);
    // Check for reset URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
      handleResetApp();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [handleResetApp]);

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsMusicPlayerVisible(true);
  };
  const handleCloseMusicPlayer = () => {
    setIsMusicPlayerVisible(false);
    setCurrentTrack(null);
  };
  useEffect(() => {
    updateNavigationState(!!artist);
  }, [artist]);
  useEffect(() => {
    updateNavigationState(!!artist);
    setError(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        handleResetApp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const loadCachedData = () => {
      try {
        const cachedData = localStorage.getItem('trackerData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.artist) {
            setArtist(parsedData.artist);
            setError(null);
          }
        }
      } catch {
        localStorage.removeItem('trackerData');
        setError(null);
      }
    };
    loadCachedData();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [artist, handleResetApp]);

  const handleSheetChange = async (sheetType: SheetType) => {
    setCurrentSheetType(sheetType);
    // No need to make API call - filtering is done client-side
  };

  const handleFormSubmit = async (googleDocsUrl: string, sheetType: SheetType = 'unreleased') => {
    setLoading(true);
    setError(null);
    setCurrentUrl(googleDocsUrl);
    setCurrentSheetType(sheetType);
    
    // Extract document ID from URL
    const docIdMatch = googleDocsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const docId = docIdMatch ? docIdMatch[1] : '';
    setCurrentDocId(docId);
    
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleDocsUrl,
        }),
      });
      const data: ParsedSpreadsheetData & { error?: string; id?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse spreadsheet');
      }
      if (data.id) {
        router.push(`/${data.id}`);
        return;
      }
      if (data.artist) {
        startTransition(() => {
          setError(null);
          setArtist(data.artist);
        });
        setTimeout(() => setError(null), 0);
        if (data.error) {
          console.warn('Info message from API:', data.error);
        }
      } else {
        throw new Error(data.error || 'No data received');
      }
      const trackerData = {
        artist: data.artist,
        hasUpdatesPage: data.hasUpdatesPage || true,
        hasStatisticsPage: data.hasStatisticsPage || true
      };
      localStorage.setItem('trackerData', JSON.stringify(trackerData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setArtist(null);
    } finally {
      setLoading(false);
    }
  };
  const handleReset = () => {
    setArtist(null);
    setError(null);
    localStorage.removeItem('trackerData');
  };
  return (
    <div className="min-h-screen bg-slate-900">
      {!artist ? (
        <div className="py-12">
          <GoogleDocsForm onSubmit={handleFormSubmit} loading={loading} />
          {error && (
            <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-xl shadow-sm">
              <h3 className="font-medium mb-1">Error</h3>
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6">
          {/* Sheet Navigation */}
          {currentUrl && (
            <SheetNavigation 
              currentSheet={currentSheetType}
              onSheetChange={handleSheetChange}
              isLoading={loading}
            />
          )}
          
          {/* Header with Back Button */}
          <header className="glass-effect sticky top-0 z-40 mb-6">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Parse Another Spreadsheet</span>
                </button>
                <div className="text-right">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">TrackerParse</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Music Tracker Parser</p>
                </div>
              </div>
            </div>
          </header>
          {/* Error Display - Moved to Top */}
          {error && (
            <div className="max-w-6xl mx-auto px-6 mb-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200 rounded-xl shadow-sm">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Notice</h3>
                    <p>{error}</p>
                  </div>
                  <button
                    onClick={handleResetApp}
                    className="ml-4 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Artist Display */}
          {deferredArtist && (
            <ModernArtist 
              artist={deferredArtist} 
              onPlayTrack={handlePlayTrack}
              onTrackInfo={handlePlayTrack} // Use same handler for track info for now
              currentTrack={currentTrack}
            />
          )}
        </div>
      )}
      {/* Music Player */}
      <MusicPlayer
        track={currentTrack}
        isVisible={isMusicPlayerVisible}
        onClose={handleCloseMusicPlayer}
      />
    </div>
  );
}
