'use client';

import React from 'react';

interface QualityTagProps {
  quality: string;
}

const QualityTag: React.FC<QualityTagProps> = ({ quality }) => {
  const getQualityInfo = (quality: string) => {
    const lowerQuality = quality.toLowerCase();
    
    // Not available/unavailable tracks
    if (lowerQuality.includes('not available') || lowerQuality.includes('unavailable')) {
      return {
        classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-600',
        icon: '❌',
        label: 'Unavailable'
      };
    }
    
    // Snippet/Low Quality
    if (lowerQuality.includes('lq') || lowerQuality.includes('snippet')) {
      return {
        classes: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-700',
        icon: '📱',
        label: quality
      };
    }
    
    // Medium Quality
    if (lowerQuality.includes('mq') || lowerQuality.includes('medium')) {
      return {
        classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
        icon: '🎵',
        label: quality
      };
    }
    
    // High Quality/CDQ
    if (lowerQuality.includes('hq') || lowerQuality.includes('cdq') || lowerQuality.includes('320')) {
      return {
        classes: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-700',
        icon: '🎧',
        label: quality
      };
    }
    
    // Lossless/FLAC
    if (lowerQuality.includes('lossless') || lowerQuality.includes('flac')) {
      return {
        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
        icon: '💎',
        label: quality
      };
    }
    
    // Original/OG
    if (lowerQuality.includes('og') || lowerQuality.includes('original')) {
      return {
        classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-700',
        icon: '👑',
        label: quality
      };
    }
    
    // Default
    return {
      classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
      icon: '🎶',
      label: quality
    };
  };

  const qualityInfo = getQualityInfo(quality);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 ${qualityInfo.classes}`}>
      <span className="mr-1 text-xs">{qualityInfo.icon}</span>
      {qualityInfo.label}
    </span>
  );
};

export default QualityTag;
