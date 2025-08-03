'use client';

import { useState } from 'react';
import { SheetType } from './SheetNavigation';

interface GoogleDocsFormProps {
  onSubmit: (url: string, sheetType?: SheetType) => void;
  loading: boolean;
}

export default function GoogleDocsForm({ onSubmit, loading }: GoogleDocsFormProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  const isValidGoogleDocsUrl = (url: string) => {
    return url.includes('docs.google.com') && (url.includes('/d/') || url.includes('id='));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="glass-effect rounded-2xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/30">
        <div className="text-center mb-8">
          <div className="w-16 h-16 music-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            TrackerHub
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg">
            TrackerParse is an ad-free service that allows you to listen to audio from Google Sheets.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Enter a Google Docs spreadsheet URL to view artist tracks and albums
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="google-docs-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Google Docs Spreadsheet URL
            </label>
            <input
              id="google-docs-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
              required
            />
            {url && !isValidGoogleDocsUrl(url) && (
              <p className="text-red-500 text-sm mt-1">
                Please enter a valid Google Docs spreadsheet URL
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim() || !isValidGoogleDocsUrl(url)}
            className="w-full music-gradient hover:opacity-90 disabled:opacity-50 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 hover:shadow-lg disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Parsing...</span>
              </div>
            ) : (
              'Parse Spreadsheet'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Try an Example:</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
            Want to see how it works? Try the{' '}
            <button
              type="button"
              onClick={() => setUrl('https://docs.google.com/spreadsheets/d/1RhaRte-A_4LFzB6JnKJHzdTbDEq0MmGRMp1sj7sFRgg/')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
            >
              Beep Tracker
            </button>
          </p>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-800 dark:text-white mb-2">Expected Data Structure:</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Your spreadsheet should contain columns for:
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-2 gap-1">
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
