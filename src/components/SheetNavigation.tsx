'use client';

import React from 'react';

export type SheetType = 'unreleased' | 'best';

interface SheetNavigationProps {
  currentSheet: SheetType;
  onSheetChange: (sheet: SheetType) => void;
  isLoading?: boolean;
}

export default function SheetNavigation({ currentSheet, onSheetChange, isLoading }: SheetNavigationProps) {
  const sheets = [
    {
      id: 'unreleased' as const,
      label: 'All Tracks',
      icon: '🎵',
      description: 'All unreleased tracks',
      color: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
    },
    {
      id: 'best' as const,
      label: 'Best Tracks',
      icon: '🏆',
      description: 'High quality and special tracks',
      color: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700'
    }
  ];

  return (
    <div className="w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 py-3 overflow-x-auto">
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              onClick={() => !isLoading && onSheetChange(sheet.id)}
              disabled={isLoading}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap
                ${currentSheet === sheet.id 
                  ? `${sheet.color} text-white shadow-md` 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
              `}
              title={sheet.description}
            >
              <span className="text-lg">{sheet.icon}</span>
              <span>{sheet.label}</span>
              {isLoading && currentSheet === sheet.id && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
