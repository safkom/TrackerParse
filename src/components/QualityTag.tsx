'use client';

import React from 'react';

interface QualityTagProps {
  quality: string;
}

const QualityTag: React.FC<QualityTagProps> = ({ quality }) => {
  const getQualityInfo = (quality: string) => {
    const normalizedQuality = quality.toLowerCase().trim();
    
    // Map to official tracker quality categories
    // Lossless (highest quality)
    if (normalizedQuality.includes('lossless') || normalizedQuality.includes('flac') || normalizedQuality.includes('wav')) {
      return {
        classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-700',
        icon: '💎',
        label: 'Lossless'
      };
    }
    
    // CD Quality
    if (normalizedQuality.includes('cd quality') || normalizedQuality.includes('cdq') || normalizedQuality.includes('320')) {
      return {
        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
        icon: '�',
        label: 'CD Quality'
      };
    }
    
    // High Quality
    if (normalizedQuality.includes('high quality') || normalizedQuality.includes('hq') || normalizedQuality.includes('256')) {
      return {
        classes: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-700',
        icon: '�',
        label: 'High Quality'
      };
    }
    
    // Low Quality
    if (normalizedQuality.includes('low quality') || normalizedQuality.includes('lq') || normalizedQuality.includes('128')) {
      return {
        classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border border-orange-200 dark:border-orange-700',
        icon: '📻',
        label: 'Low Quality'
      };
    }
    
    // Recordings (live recordings, phone recordings, etc.)
    if (normalizedQuality.includes('recording') || normalizedQuality.includes('live') || normalizedQuality.includes('phone')) {
      return {
        classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
        icon: '�',
        label: 'Recording'
      };
    }
    
    // Not Available
    if (normalizedQuality.includes('not available') || normalizedQuality.includes('unavailable')) {
      return {
        classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-600',
        icon: '❌',
        label: 'Not Available'
      };
    }
    
    // Default for unknown quality
    return {
      classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
      icon: '❓',
      label: quality || 'Unknown'
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
