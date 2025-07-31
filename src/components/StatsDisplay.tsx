'use client';

import React from 'react';
import { EraMetadata } from '@/types';

interface StatsDisplayProps {
  eraName: string;
  metadata: EraMetadata;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function StatsDisplay({ eraName, metadata, isExpanded, onToggle }: StatsDisplayProps) {
  const statsItems = [
    { label: 'OG Files', value: metadata.ogFiles, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900', icon: '🟢' },
    { label: 'Full Files', value: metadata.fullFiles, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900', icon: '🔵' },
    { label: 'Tagged Files', value: metadata.taggedFiles, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900', icon: '🟣' },
    { label: 'Partial Files', value: metadata.partialFiles, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900', icon: '🟡' },
    { label: 'Snippet Files', value: metadata.snippetFiles, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900', icon: '🟠' },
    { label: 'Stem Bounce Files', value: metadata.stemBounceFiles, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900', icon: '🟤' },
    { label: 'Unavailable Files', value: metadata.unavailableFiles, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900', icon: '🔴' },
  ];

  const totalFiles = statsItems.reduce((sum, item) => sum + item.value, 0);
  const nonZeroStats = statsItems.filter(item => item.value > 0);

  if (!isExpanded) {
    // Compact inline display
    return (
      <div className="flex items-center space-x-2 text-xs">
        <button 
          onClick={onToggle}
          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="View era statistics"
        >
          <svg 
            className="w-3 h-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>{totalFiles} files</span>
        </button>
        
        {/* Quick preview of top file types */}
        {nonZeroStats.slice(0, 3).map((item, index) => (
          <span 
            key={index} 
            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 ${item.bgColor} ${item.color} rounded text-xs`}
            title={`${item.value} ${item.label}`}
          >
            <span className="text-xs">{item.icon}</span>
            <span className="font-medium">{item.value}</span>
          </span>
        ))}
      </div>
    );
  }

  // Expanded inline display
  return (
    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {eraName} Statistics
        </h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Collapse statistics"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Total Summary */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{totalFiles}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Files</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {statsItems.map((item, index) => (
          <div key={index} className={`flex items-center justify-between p-2 ${item.bgColor} rounded-lg`}>
            <div className="flex items-center space-x-2">
              <span className="text-sm">{item.icon}</span>
              <div>
                <div className={`text-sm font-medium ${item.color}`}>{item.label}</div>
                {totalFiles > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {((item.value / totalFiles) * 100).toFixed(1)}%
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
      {totalFiles > 0 && nonZeroStats.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Distribution</h4>
          <div className="space-y-2">
            {nonZeroStats.map((item, index) => {
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
                        className={`h-2 rounded-full transition-all duration-300 ${
                          item.color.includes('green') ? 'bg-green-500' :
                          item.color.includes('blue') ? 'bg-blue-500' :
                          item.color.includes('purple') ? 'bg-purple-500' :
                          item.color.includes('yellow') ? 'bg-yellow-500' :
                          item.color.includes('orange') ? 'bg-orange-500' :
                          item.color.includes('indigo') ? 'bg-indigo-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
