'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const Navigation = memo(() => {
  const searchParams = useSearchParams();
  const docId = searchParams.get('docId');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-purple-200/30 dark:border-slate-700 shadow-lg transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-slate-100 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
            >
              TrackerParse
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {docId && (
              <>
                <Link
                  href={`/best?docId=${docId}`}
                  className="px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all duration-200 flex items-center gap-1"
                >
                  <span>🏆</span>
                  <span className="hidden sm:inline">Best</span>
                </Link>
                <Link
                  href={`/recent?docId=${docId}`}
                  className="px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200 flex items-center gap-1"
                >
                  <span>🕐</span>
                  <span className="hidden sm:inline">Recent</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;