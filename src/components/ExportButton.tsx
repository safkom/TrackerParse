'use client';

import React, { useState } from 'react';
import { Artist } from '@/types';
import ExportModal from './ExportModal';

interface ExportButtonProps {
  artist: Artist;
  docId: string;
  sourceUrl: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const ExportButton: React.FC<ExportButtonProps> = ({ 
  artist, 
  docId, 
  sourceUrl, 
  className = '',
  variant = 'outline',
  size = 'md'
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const baseClasses = "inline-flex items-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500", 
    outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm", 
    lg: "px-6 py-3 text-base"
  };

  const iconSize = {
    sm: "w-4 h-4",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      >
        <svg 
          className={`${iconSize[size]} mr-2`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
        Export Data
      </button>

      <ExportModal
        artist={artist}
        docId={docId}
        sourceUrl={sourceUrl}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ExportButton;
