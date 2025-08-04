'use client';

import React from 'react';
import { EraMetadata } from '@/types';

interface StatsDisplayProps {
  eraName: string;
  metadata: EraMetadata;
  isExpanded: boolean;
  onToggle: () => void;
  selectedQualities?: string[];
  onQualityFilter?: (qualities: string[]) => void;
}

export default function StatsDisplay({
  eraName: _eraName,
  metadata,
  isExpanded,
  onToggle,
  selectedQualities: _selectedQualities = [],
  onQualityFilter: _onQualityFilter,
}: StatsDisplayProps) {
  void _eraName;
  void _selectedQualities;
  void _onQualityFilter;
  const statsItems = [
    { label: 'OG Files', value: metadata.ogFiles, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900', icon: '🟢', key: 'og' },
    { label: 'Full Files', value: metadata.fullFiles, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900', icon: '🔵', key: 'full' },
    { label: 'Tagged Files', value: metadata.taggedFiles, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900', icon: '🟣', key: 'tagged' },
    { label: 'Partial Files', value: metadata.partialFiles, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900', icon: '🟡', key: 'partial' },
    { label: 'Snippet Files', value: metadata.snippetFiles, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900', icon: '🟠', key: 'snippet' },
    { label: 'Stem Bounce Files', value: metadata.stemBounceFiles, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900', icon: '🟤', key: 'stem' },
    { label: 'Unavailable Files', value: metadata.unavailableFiles, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900', icon: '🔴', key: 'unavailable' },
  ];

  const totalFiles = statsItems.reduce((sum, item) => sum + item.value, 0);
  const nonZeroStats = statsItems.filter(item => item.value > 0);

  if (!isExpanded) {
    // Compact inline display - Fixed width to prevent layout shifts
    return (
      <div className="flex items-center space-x-2 text-xs stats-display">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
          title="View era statistics"
        >
          <svg 
            className="w-3 h-3 flex-shrink-0" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="font-medium">{totalFiles}</span>
        </button>
        
        {/* Top file types - Limited to save space */}
        <div className="flex gap-1 overflow-hidden">
          {nonZeroStats.slice(0, 2).map((item, index) => (
            <span 
              key={index} 
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 ${item.bgColor} ${item.color} rounded text-xs whitespace-nowrap`}
              title={`${item.value} ${item.label}`}
            >
              <span className="text-xs">{item.icon}</span>
              <span className="font-medium">{item.value}</span>
            </span>
          ))}
          {nonZeroStats.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
              +{nonZeroStats.length - 2}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Expanded stats should render below the era, not inline
  return null;
}

//Separate component for expanded stats view with quality filtering
export function ExpandedStatsDisplay({ 
  eraName, 
  metadata, 
  onClose, 
  selectedQualities = [], 
  onQualityFilter 
}: { 
  eraName: string; 
  metadata: EraMetadata; 
  onClose: () => void;
  selectedQualities?: string[];
  onQualityFilter?: (qualities: string[]) => void;
}) {
  const statsItems = [
    { label: 'OG Files', value: metadata.ogFiles, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900', icon: '🟢', key: 'og' },
    { label: 'Full Files', value: metadata.fullFiles, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900', icon: '🔵', key: 'full' },
    { label: 'Tagged Files', value: metadata.taggedFiles, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900', icon: '🟣', key: 'tagged' },
    { label: 'Partial Files', value: metadata.partialFiles, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900', icon: '🟡', key: 'partial' },
    { label: 'Snippet Files', value: metadata.snippetFiles, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900', icon: '🟠', key: 'snippet' },
    { label: 'Stem Bounce Files', value: metadata.stemBounceFiles, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900', icon: '🟤', key: 'stem' },
    { label: 'Unavailable Files', value: metadata.unavailableFiles, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900', icon: '🔴', key: 'unavailable' },
  ];

  const totalFiles = statsItems.reduce((sum, item) => sum + item.value, 0);
  const nonZeroStats = statsItems.filter(item => item.value > 0);

  const handleQualityClick = (qualityKey: string) => {
    if (!onQualityFilter) return;
    
    const newQualities = selectedQualities.includes(qualityKey)
      ? selectedQualities.filter(q => q !== qualityKey) // Remove if selected
      : [...selectedQualities, qualityKey]; // Add if not selected
    
    onQualityFilter(newQualities);
  };

  return (
    <div className="mt-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📊 {eraName} Statistics
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          aria-label="Collapse statistics"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Quality Filter Note */}
      {onQualityFilter && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
          💡 Click on quality types below to filter tracks • {selectedQualities.length === 0 ? 'Showing all tracks' : `Showing ${selectedQualities.length} selected type${selectedQualities.length > 1 ? 's' : ''}`}
        </p>
      )}

      {/* Clickable Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
        {nonZeroStats.map((item, index) => {
          const isSelected = selectedQualities.includes(item.key);
          const isClickable = onQualityFilter && item.value > 0;
          
          return (
            <button
              key={index}
              onClick={(e) => {
                if (isClickable) {
                  e.stopPropagation();
                  handleQualityClick(item.key);
                }
              }}
              disabled={!isClickable}
              className={`
                flex items-center justify-between p-3 rounded-lg transition-all duration-200
                ${isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-md hover:bg-white dark:hover:bg-gray-600' : 'cursor-default'}
                ${isSelected 
                  ? `ring-2 ring-offset-1 ring-offset-gray-50 dark:ring-offset-gray-800 ${item.bgColor} shadow-lg` 
                  : item.bgColor
                }
              `}
              title={`${item.value} ${item.label}${isClickable ? ' • Click to filter' : ''}`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">{item.icon}</span>
                <div className="text-left">
                  <div className={`text-xs font-medium ${item.color}`}>
                    {item.label.replace(' Files', '')}
                  </div>
                  {isClickable && (
                    <div className="text-xs opacity-60">
                      {isSelected ? '✓ Selected' : 'Click to filter'}
                    </div>
                  )}
                </div>
              </div>
              <div className={`text-sm font-bold ${item.color}`}>
                {item.value}
              </div>
            </button>
          );
        })}
      </div>

      {/* Total Summary */}
      {totalFiles > 0 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-600 text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Total: <span className="font-semibold text-gray-900 dark:text-white">{totalFiles}</span> files
            {selectedQualities.length > 0 && (
              <span className="ml-2">
                • <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onQualityFilter?.([]);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Show All
                </button>
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}