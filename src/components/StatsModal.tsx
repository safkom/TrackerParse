'use client';

import React from 'react';
import { EraMetadata } from '@/types';
import Portal from './Portal';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eraName: string;
  metadata: EraMetadata;
}

export default function StatsModal({ isOpen, onClose, eraName, metadata }: StatsModalProps) {
  if (!isOpen) return null;

  const statsItems = [
    { label: 'OG Files', value: metadata.ogFiles, color: 'text-green-600 dark:text-green-400', icon: '🟢' },
    { label: 'Full Files', value: metadata.fullFiles, color: 'text-blue-600 dark:text-blue-400', icon: '🔵' },
    { label: 'Tagged Files', value: metadata.taggedFiles, color: 'text-purple-600 dark:text-purple-400', icon: '🟣' },
    { label: 'Partial Files', value: metadata.partialFiles, color: 'text-yellow-600 dark:text-yellow-400', icon: '🟡' },
    { label: 'Snippet Files', value: metadata.snippetFiles, color: 'text-orange-600 dark:text-orange-400', icon: '🟠' },
    { label: 'Stem Bounce Files', value: metadata.stemBounceFiles, color: 'text-indigo-600 dark:text-indigo-400', icon: '🟤' },
    { label: 'Unavailable Files', value: metadata.unavailableFiles, color: 'text-red-600 dark:text-red-400', icon: '🔴' },
  ];

  const totalFiles = statsItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        style={{ zIndex: 10000 }}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <div 
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {eraName} Statistics
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 p-4 overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(80vh - 120px)' }}>
            {/* Total Summary */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalFiles}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Files</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="space-y-3">
              {statsItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      {totalFiles > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {((item.value / totalFiles) * 100).toFixed(1)}% of total
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bars */}
            {totalFiles > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Distribution</h3>
                <div className="space-y-2">
                  {statsItems.filter(item => item.value > 0).map((item, index) => {
                    const percentage = (item.value / totalFiles) * 100;
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                            <span className={item.color}>{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
