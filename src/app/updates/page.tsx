'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UpdateEntry } from '@/types';
import Link from 'next/link';

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Function to format date according to locale
  const formatDate = (dateString: string | undefined): { formatted: string | null, year: number | null, isValid: boolean } => {
    if (!dateString) return { formatted: null, year: null, isValid: false };
    
    // Check for malformed dates with ?? 
    if (dateString.includes('??')) {
      return { formatted: dateString, year: null, isValid: false };
    }
    
    try {
      // Parse M/D/YYYY or MM/DD/YYYY format (handle both single and double digits)
      const [month, day, year] = dateString.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Validate the date
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return { formatted: dateString, year: null, isValid: false };
      }
      
      // Format according to user's locale
      const formatted = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      return { formatted, year, isValid: true };
    } catch {
      return { formatted: dateString, year: null, isValid: false };
    }
  };

  // Function to get year color with better consistency and readability
  const getYearColor = (year: number | null, isValid: boolean): string => {
    if (!isValid || year === null) return 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'; // Gray for invalid/unknown dates
    
    const yearColors: Record<number, string> = {
      2025: 'text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900',
      2024: 'text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900', 
      2023: 'text-violet-800 dark:text-violet-200 bg-violet-100 dark:bg-violet-900',
      2022: 'text-orange-800 dark:text-orange-200 bg-orange-100 dark:bg-orange-900',
      2021: 'text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900',
      2020: 'text-indigo-800 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-900',
      2019: 'text-pink-800 dark:text-pink-200 bg-pink-100 dark:bg-pink-900',
      2018: 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900',
      2017: 'text-cyan-800 dark:text-cyan-200 bg-cyan-100 dark:bg-cyan-900',
      2016: 'text-lime-800 dark:text-lime-200 bg-lime-100 dark:bg-lime-900',
    };
    
    return yearColors[year] || 'text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900'; // Default slate for other years
  };

  useEffect(() => {
    // Get updates from localStorage where we cache the parsed data
    const loadUpdates = async () => {
      try {
        const cachedData = localStorage.getItem('trackerData');
        if (!cachedData) {
          // No data available, redirect to home and replace history
          router.replace('/');
          return;
        }
        
        const parsedData = JSON.parse(cachedData);
        if (parsedData.artist && parsedData.artist.updates) {
          setUpdates(parsedData.artist.updates);
        }
        setLoading(false);
      } catch {
        setError('Failed to load updates');
        setLoading(false);
      }
    };

    loadUpdates();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="container mx-auto">
          <div className="text-center text-gray-900 dark:text-white">Loading updates...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="container mx-auto">
          <div className="text-center text-red-600 dark:text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Updates</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Latest changes and updates to the tracker
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {updates.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <div className="text-6xl mb-4">📝</div>
              <div className="text-xl font-medium mb-2">No updates available</div>
              <div className="text-gray-400 dark:text-gray-500">Parse a spreadsheet first to see updates</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {updates.map((update, index) => {
                const { formatted, year, isValid } = formatDate(update.date);
                const dateColor = getYearColor(year, isValid);
                
                return (
                  <div key={index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white text-base leading-relaxed font-medium">
                          {update.description}
                        </p>
                      </div>
                      {formatted && (
                        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${dateColor}`}>
                          {formatted}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tracker
          </Link>
        </div>
      </div>
    </div>
  );
}
