'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StatEntry, Era } from '@/types';
import Link from 'next/link';

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get statistics from localStorage where we cache the parsed data
    const loadStatistics = async () => {
      try {
        const cachedData = localStorage.getItem('trackerData');
        if (!cachedData) {
          // No data available, redirect to home and replace history
          router.replace('/');
          return;
        }
        
        const parsedData = JSON.parse(cachedData);
        
        // Create statistics from the new Tracker data structure
        if (parsedData.tracker) {
          const tracker = parsedData.tracker;
          const stats: StatEntry[] = [
            { label: 'Total Tracks', value: tracker.stats.totalTracks, type: 'count' },
            { label: 'Total Eras', value: tracker.stats.totalEras, type: 'count' },
            { label: 'Special Tracks', value: tracker.stats.specialTracks, type: 'special' },
            { label: 'Recent Leaks', value: tracker.stats.recentLeaks, type: 'recent' },
          ];
          
          // Add era-specific statistics
          tracker.eras.forEach((era: Era) => {
            stats.push({
              label: `${era.name} Tracks`,
              value: era.tracks.length,
              type: 'era'
            });
          });
          
          setStatistics(stats);
        } else if (parsedData.artist && parsedData.artist.statistics && Array.isArray(parsedData.artist.statistics)) {
          // Fallback for legacy data structure
          setStatistics(parsedData.artist.statistics);
        }
        setLoading(false);
      } catch {
        setError('Failed to load statistics');
        setLoading(false);
      }
    };

    loadStatistics();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="container mx-auto">
          <div className="text-center text-gray-900 dark:text-white">Loading statistics...</div>
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

  // Group statistics by type
  const groupedStats = statistics.reduce((acc, stat) => {
    if (!acc[stat.type]) {
      acc[stat.type] = [];
    }
    acc[stat.type].push(stat);
    return acc;
  }, {} as Record<string, StatEntry[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Statistics</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Comprehensive statistics and counts for the tracker
          </p>
        </div>

        {statistics.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-xl font-medium mb-2">No statistics available</div>
              <div className="text-gray-400 dark:text-gray-500">Parse a spreadsheet first to see statistics</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupedStats).map(([category, stats]) => (
              <div key={category} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">{category}</h2>
                <div className="space-y-3">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-sm">
                      <div className="text-gray-800 dark:text-gray-200 font-medium">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
