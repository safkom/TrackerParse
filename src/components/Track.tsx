'use client';

import { Track as TrackType } from '@/types';

interface TrackProps {
  track: TrackType;
}

export default function Track({ track }: TrackProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col space-y-3">
        {/* Track Name */}
        <h3 className="text-xl font-semibold text-gray-800">
          {track.name || 'Untitled Track'}
        </h3>

        {/* Era */}
        {track.era && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">Era:</span>
            <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
              {track.era}
            </span>
          </div>
        )}

        {/* Track Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {track.trackLength && (
            <div>
              <span className="font-medium text-gray-500">Length:</span>
              <span className="ml-2 text-gray-700">{track.trackLength}</span>
            </div>
          )}

          {track.quality && (
            <div>
              <span className="font-medium text-gray-500">Quality:</span>
              <span className="ml-2 text-gray-700">{track.quality}</span>
            </div>
          )}

          {track.fileDate && (
            <div>
              <span className="font-medium text-gray-500">File Date:</span>
              <span className="ml-2 text-gray-700">{track.fileDate}</span>
            </div>
          )}

          {track.leakDate && (
            <div>
              <span className="font-medium text-gray-500">Leak Date:</span>
              <span className="ml-2 text-gray-700">{track.leakDate}</span>
            </div>
          )}

          {track.availableLength && (
            <div>
              <span className="font-medium text-gray-500">Available Length:</span>
              <span className="ml-2 text-gray-700">{track.availableLength}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {track.notes && (
          <div>
            <span className="font-medium text-gray-500 block mb-1">Notes:</span>
            <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">
              {track.notes}
            </p>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-2">
          {track.linkToGoogleDoc && (
            <a
              href={track.linkToGoogleDoc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
            >
              📄 Google Doc
            </a>
          )}

          {track.discordLink && (
            <a
              href={track.discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors"
            >
              💬 Discord
            </a>
          )}

          {track.links.map((link, index) => (
            link && (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
              >
                🔗 Link {index + 1}
              </a>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
