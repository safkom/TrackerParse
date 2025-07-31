'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DiagnosticPage() {
  const [localStorageData, setLocalStorageData] = useState<Record<string, unknown> | null>(null);
  const [apiData, setApiData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage
    const cached = localStorage.getItem('trackerData');
    if (cached) {
      try {
        setLocalStorageData(JSON.parse(cached));
      } catch {
        setError('Invalid JSON in localStorage');
      }
    }

    // Test API
    fetch('/api/debug')
      .then(res => res.json())
      .then(data => setApiData(data))
      .catch(err => setError(err.message));
  }, []);

  const clearCache = () => {
    try {
      // Clear localStorage
      localStorage.removeItem('trackerData');
      
      // Clear any other relevant localStorage items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('tracker') || key.includes('cache') || key.includes('error')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage too
      sessionStorage.clear();
      
      setLocalStorageData(null);
      
      // Refresh the page to ensure clean state
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TrackerHub Diagnostic</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">LocalStorage Data</h2>
            {localStorageData ? (
                            <div className="bg-blue-50 p-4 rounded">
                <h3 className="text-lg font-bold mb-2">Local Storage Data</h3>
                <p><strong>Artist:</strong> {(localStorageData as { artist?: { name?: string } })?.artist?.name || 'Unknown'}</p>
                <p><strong>Description:</strong> {(localStorageData as { artist?: { description?: string } })?.artist?.description || 'Unknown'}</p>
                <p><strong>Albums:</strong> {(localStorageData as { artist?: { albums?: unknown[] } })?.artist?.albums?.length || 0}</p>
                <p><strong>Last Updated:</strong> {(localStorageData as { artist?: { lastUpdated?: string } })?.artist?.lastUpdated || 'Unknown'}</p>
              </div>
            ) : (
              <p className="text-gray-500">No data in localStorage</p>
            )}
          </div>

                        <div className="bg-green-50 p-4 rounded">
                <h3 className="text-lg font-bold mb-2">API Data</h3>
                <p><strong>Status:</strong> {String((apiData as { status?: string })?.status || 'Unknown')}</p>
                <p><strong>Artist:</strong> {(apiData as { artist?: { name?: string } })?.artist?.name || 'Unknown'}</p>
                <p><strong>Description:</strong> {(apiData as { artist?: { description?: string } })?.artist?.description || 'Unknown'}</p>
                <p><strong>Albums:</strong> {(apiData as { artist?: { albumCount?: number } })?.artist?.albumCount || 0}</p>
                <p><strong>Tracks:</strong> {(apiData as { artist?: { totalTracks?: number } })?.artist?.totalTracks || 0}</p>
                <p><strong>Last Updated:</strong> {String((apiData as { lastUpdated?: string })?.lastUpdated || 'Unknown')}</p>
              </div>
        </div>

        <div className="mt-6 space-x-4">
          <button
            onClick={clearCache}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Clear Cache & Go to App
          </button>
          <Link
            href="/"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-block"
          >
            Go to App (Keep Cache)
          </Link>
        </div>
      </div>
    </div>
  );
}
