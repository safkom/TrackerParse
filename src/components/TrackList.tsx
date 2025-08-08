'use client';

import { Track as TrackType } from '@/types';
import Track from './Track';

interface TrackListProps {
  tracks: (TrackType & { albumName?: string })[];
  onPlay?: (track: TrackType) => void;
  onTrackInfo?: (track: TrackType) => void;
  onScrollToTrack?: (trackId: string) => void;
}

export default function TrackList({ tracks, onPlay, onTrackInfo, onScrollToTrack }: TrackListProps) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎶</div>
        <p className="text-gray-600 dark:text-gray-400">No tracks to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => (
        <Track 
          key={track.id || index} 
          track={track} 
          onPlay={onPlay} 
          onTrackInfo={onTrackInfo}
          onScrollToTrack={onScrollToTrack} 
        />
      ))}
    </div>
  );
}
