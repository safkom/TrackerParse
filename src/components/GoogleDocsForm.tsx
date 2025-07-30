'use client';

import { useState } from 'react';

interface GoogleDocsFormProps {
  onSubmit: (url: string, forceRefresh?: boolean) => void;
  loading: boolean;
}

export default function GoogleDocsForm({ onSubmit, loading }: GoogleDocsFormProps) {
  const [url, setUrl] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim(), forceRefresh);
    }
  };

  const isValidGoogleDocsUrl = (url: string) => {
    return url.includes('docs.google.com') && (url.includes('/d/') || url.includes('id='));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">TrackerHub</h1>
          <p className="text-gray-600">
            Enter a Google Docs spreadsheet URL to view artist tracks and albums
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="google-docs-url" className="block text-sm font-medium text-gray-700 mb-2">
              Google Docs Spreadsheet URL
            </label>
            <input
              id="google-docs-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
            {url && !isValidGoogleDocsUrl(url) && (
              <p className="text-red-500 text-sm mt-1">
                Please enter a valid Google Docs spreadsheet URL
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="force-refresh"
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="force-refresh" className="text-sm text-gray-700">
              Force refresh (ignore cache)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim() || !isValidGoogleDocsUrl(url)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Parsing...</span>
              </div>
            ) : (
              'Parse Spreadsheet'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Expected Data Structure:</h3>
          <p className="text-sm text-gray-600 mb-2">
            Your spreadsheet should contain columns for:
          </p>
          <div className="text-xs text-gray-500 grid grid-cols-2 gap-1">
            <span>• Era</span>
            <span>• Name</span>
            <span>• Link to google doc</span>
            <span>• Notes</span>
            <span>• Discord link</span>
            <span>• Track Length</span>
            <span>• File Date</span>
            <span>• Leak Date</span>
            <span>• Available Length</span>
            <span>• Quality</span>
            <span>• Link(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
