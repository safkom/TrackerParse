'use client';

import { useState } from 'react';
import GoogleDocsForm from '@/components/GoogleDocsForm';
import Artist from '@/components/Artist';
import { Artist as ArtistType, ParsedSpreadsheetData } from '@/types';

export default function Home() {
  const [artist, setArtist] = useState<ArtistType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (googleDocsUrl: string, forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleDocsUrl,
          forceRefresh,
        }),
      });

      const data: ParsedSpreadsheetData | { error: string } = await response.json();

      if (!response.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'Failed to parse spreadsheet');
      }

      setArtist(data.artist);
      if (data.error) {
        setError(data.error);
      }
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!artist ? (
        <div className="py-12">
          <GoogleDocsForm onSubmit={handleFormSubmit} loading={loading} />
          
          {error && (
            <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <h3 className="font-medium mb-1">Error</h3>
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6">
          {/* Back Button */}
          <div className="max-w-6xl mx-auto px-6 mb-6">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Parse Another Spreadsheet</span>
            </button>
          </div>

          {/* Artist Display */}
          <Artist artist={artist} error={error || undefined} />
        </div>
      )}
    </div>
  );
}
