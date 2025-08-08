'use client';

import React from 'react';

interface AvailabilityTagProps {
  availability: string;
}

const AvailabilityTag: React.FC<AvailabilityTagProps> = ({ availability }) => {
  const getAvailabilityInfo = (availability: string) => {
    const normalized = availability.toLowerCase().trim();
    
    // Map to official tracker availability categories
    
    // OG Files (original files from official sources)
    if (normalized.includes('og file') || normalized.includes('original file')) {
      return {
        classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-700',
        icon: '👑',
        label: 'OG File'
      };
    }
    
    // Full (complete songs)
    if (normalized === 'full' || normalized.includes('full') && !normalized.includes('total')) {
      return {
        classes: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-700',
        icon: '💎',
        label: 'Full'
      };
    }
    
    // Tagged (files with proper metadata)
    if (normalized.includes('tagged')) {
      return {
        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
        icon: '🏷️',
        label: 'Tagged'
      };
    }
    
    // Partial (incomplete songs)
    if (normalized.includes('partial')) {
      return {
        classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
        icon: '⚠️',
        label: 'Partial'
      };
    }
    
    // Stem Bounces (individual instrument stems)
    if (normalized.includes('stem bounce') || normalized.includes('stem')) {
      return {
        classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700',
        icon: '🎚️',
        label: 'Stem Bounce'
      };
    }
    
    // Snippets (short clips)
    if (normalized.includes('snippet') || normalized.includes('clip')) {
      return {
        classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border border-orange-200 dark:border-orange-700',
        icon: '📱',
        label: 'Snippet'
      };
    }
    
    // Beat Only (instrumental only)
    if (normalized.includes('beat only') || normalized.includes('instrumental only')) {
      return {
        classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border border-teal-200 dark:border-teal-700',
        icon: '🥁',
        label: 'Beat Only'
      };
    }
    
    // Unavailable categories (these should be grouped as "Unavailable" in stats)
    if (normalized.includes('confirmed') || normalized.includes('rumored') || 
        normalized.includes('conflicting sources') || normalized.includes('not available') || 
        normalized.includes('unavailable')) {
      return {
        classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-600',
        icon: '❌',
        label: 'Unavailable'
      };
    }
    
    // Default for unknown availability
    return {
      classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
      icon: '❓',
      label: availability || 'Unknown'
    };
  };

  const availabilityInfo = getAvailabilityInfo(availability);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 ${availabilityInfo.classes}`}>
      <span className="mr-1 text-xs">{availabilityInfo.icon}</span>
      {availabilityInfo.label}
    </span>
  );
};

export default AvailabilityTag;
