import React from 'react';
import { Track as TrackType } from '@/types';

interface TrackTitleProps {
  track: TrackType;
  className?: string;
  showVersion?: boolean;
  showDetails?: boolean;
}

/**
 * Clean track title formatter that properly separates main title, alt names, 
 * features, producers, and other metadata
 */
export const TrackTitle: React.FC<TrackTitleProps> = ({ 
  track, 
  className = "", 
  showVersion = true, 
  showDetails = true 
}) => {
  const title = track.title || {};
  
  // Extract clean main title (remove version info, production info, etc.)
  let cleanMainTitle = title.main || track.rawName || 'Unknown';
  
  // Remove common formatting patterns from main title
  cleanMainTitle = cleanMainTitle
    .replace(/\[V\d+\]/g, '') // Remove version markers like [V1], [V2]
    .replace(/\(feat\.[^)]+\)/g, '') // Remove feat. info from main title
    .replace(/\(prod\.[^)]+\)/g, '') // Remove prod. info from main title
    .replace(/\(ref\.[^)]+\)/g, '') // Remove ref. info from main title
    .replace(/\(with [^)]+\)/g, '') // Remove "with" collaborations from main title
    .replace(/\s+/g, ' ') // Clean up multiple spaces
    .trim();
  
  // Extract version info
  const versionMatch = (title.main || track.rawName || '').match(/\[V(\d+)\]/);
  const version = versionMatch ? `V${versionMatch[1]}` : null;
  
  return (
    <div className={className}>
      {/* Main clean title */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-base md:text-lg leading-tight">
        {cleanMainTitle}
      </h3>
      
      {/* Version and metadata */}
      {showDetails && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs md:text-sm">
          {/* Version */}
          {showVersion && version && (
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md font-medium">
              {version}
            </span>
          )}
          
          {/* Alt Names */}
          {title.alternateNames && title.alternateNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-gray-500 dark:text-gray-400">aka:</span>
              {title.alternateNames.slice(0, 2).map((altName, i) => (
                <span 
                  key={i}
                  className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md"
                >
                  {altName}
                </span>
              ))}
              {title.alternateNames.length > 2 && (
                <span className="text-gray-500 dark:text-gray-400">
                  +{title.alternateNames.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Features, Producers, etc. */}
      {showDetails && (
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs md:text-sm">
          {/* Features */}
          {title.features && title.features.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-purple-600 dark:text-purple-400 font-medium">feat:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {title.features.slice(0, 3).join(', ')}
                {title.features.length > 3 && ` +${title.features.length - 3} more`}
              </span>
            </div>
          )}
          
          {/* Producers */}
          {title.producers && title.producers.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-green-600 dark:text-green-400 font-medium">prod:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {title.producers.slice(0, 2).join(', ')}
                {title.producers.length > 2 && ` +${title.producers.length - 2} more`}
              </span>
            </div>
          )}
          
          {/* Collaborators */}
          {title.collaborators && title.collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-orange-600 dark:text-orange-400 font-medium">with:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {title.collaborators.slice(0, 2).join(', ')}
                {title.collaborators.length > 2 && ` +${title.collaborators.length - 2} more`}
              </span>
            </div>
          )}
          
          {/* References */}
          {title.references && title.references.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">ref:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {title.references.slice(0, 2).join(', ')}
                {title.references.length > 2 && ` +${title.references.length - 2} more`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
