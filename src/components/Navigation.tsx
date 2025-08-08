'use client';

import React, { memo } from 'react';
import Link from 'next/link';

const Navigation = memo(() => {
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
            {/* Navigation is now handled by SheetNavigation component within the tracker page */}
            <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              Universal Tracker Parser
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;