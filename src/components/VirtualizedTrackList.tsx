"use client";

import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Track } from "@/types";
import { ColorExtractor } from "@/utils/colorExtractor";
import { useVirtualList } from "@/utils/usePerformance";

interface VirtualizedTrackListProps {
  tracks: (Track & { albumName: string })[];
  onPlay?: (track: Track) => void;
  onTrackInfo?: (track: Track) => void;
  maxHeight?: number;
  disableVirtualization?: boolean; // For smaller lists that should expand naturally
}

// Individual track row component - memoized for performance
const TrackRow = React.memo<{
  track: Track & { albumName: string };
  index: number;
  onPlay?: (track: Track) => void;
  onTrackInfo?: (track: Track) => void;
  colorPalette: any;
}>(({ track, index, onPlay, onTrackInfo, colorPalette }) => {
  const getPlayableSource = (
    track: Track,
  ): { type: string; url: string; id?: string } | null => {
    if (!track.links || track.links.length === 0) return null;
    for (const link of track.links) {
      const url = typeof link === "string" ? link : link.url;
      if (url.match(/pillow(case)?s?\.(su|top)/i)) {
        let match = url.match(/\/f\/([a-f0-9]{32})/i);
        if (!match) {
          match = url.match(/([a-f0-9]{32})/i);
        }
        if (match) {
          const id = match[1];
          return { type: "pillowcase", url, id };
        }
      }
      if (url.match(/music\.froste\.lol/i)) {
        const downloadUrl = url.endsWith("/")
          ? `${url}download`
          : `${url}/download`;
        return { type: "froste", url: downloadUrl };
      }
    }
    return null;
  };

  const playable = getPlayableSource(track);
  const isNotAvailable =
    track.quality?.toLowerCase().includes("not available") ||
    track.availableLength?.toLowerCase().includes("not available") ||
    track.quality?.toLowerCase().includes("unavailable") ||
    track.availableLength?.toLowerCase().includes("unavailable");
  const hasPlayableLink = playable !== null && !isNotAvailable;

  return (
    <div
      className="flex items-center justify-between py-3 px-4 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
      style={{ height: "80px" }} // Fixed height for virtualization
    >
      {/* Track Info */}
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-start space-x-3">
          {/* Track Index */}
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1 w-8 text-right">
            {index + 1}
          </span>

          {/* Track Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {track.title?.main || track.rawName || "Untitled"}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div className="truncate">
                From: <span className="font-medium">{track.albumName}</span>
              </div>
              {track.quality && (
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      hasPlayableLink
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {track.quality}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {hasPlayableLink && onPlay && (
          <button
            onClick={() => onPlay(track)}
            className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title="Play track"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {onTrackInfo && (
          <button
            onClick={() => onTrackInfo(track)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Track info"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

TrackRow.displayName = "TrackRow";

export default function VirtualizedTrackList({
  tracks,
  onPlay,
  onTrackInfo,
  maxHeight = 600,
  disableVirtualization = false,
}: VirtualizedTrackListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

  // Generate color scheme for search results
  const colorPalette = useMemo(() => {
    return ColorExtractor.getEraColorScheme("search-results");
  }, []);

  // Use virtual scrolling for performance (only if not disabled)
  const { visibleItems, totalHeight, offsetY, onScroll } = useVirtualList({
    items: tracks,
    itemHeight: 80, // Fixed height per track
    containerHeight: disableVirtualization
      ? tracks.length * 80
      : containerHeight,
    overscan: 5,
  });

  // Update container height when component mounts (only if virtualization is enabled)
  useEffect(() => {
    if (!disableVirtualization && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableHeight = Math.min(
        maxHeight,
        window.innerHeight - rect.top - 100,
      );
      setContainerHeight(availableHeight);
    }
  }, [maxHeight, disableVirtualization]);

  // Show loading message for very large lists
  const isLargeDataset = tracks.length > 1000;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 transition-shadow duration-200 hover:shadow-lg">
      {/* Header */}
      <div
        className="relative p-4"
        style={{
          background: `linear-gradient(135deg, ${colorPalette.background} 0%, ${colorPalette.primary}15 100%)`,
          borderColor: colorPalette.primary + "30",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2
                className="text-lg font-semibold"
                style={{ color: colorPalette.text }}
              >
                All Tracks
              </h2>
              <span
                className="text-xs opacity-60"
                style={{ color: colorPalette.text }}
              >
                {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                {isLargeDataset && " (virtualized for performance)"}
              </span>
            </div>
          </div>

          {isLargeDataset && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>Optimized</span>
            </div>
          )}
        </div>
      </div>

      {/* Track List - Virtualized or Normal */}
      {disableVirtualization ? (
        // Normal list for smaller datasets
        <div className="divide-y divide-gray-200 dark:divide-gray-600">
          {tracks.map((track, index) => (
            <TrackRow
              key={`${track.id || track.rawName}-${index}`}
              track={track}
              index={index}
              onPlay={onPlay}
              onTrackInfo={onTrackInfo}
              colorPalette={colorPalette}
            />
          ))}
        </div>
      ) : (
        // Virtualized Track List for large datasets
        <div
          ref={containerRef}
          className="relative overflow-auto"
          style={{ height: containerHeight }}
          onScroll={onScroll}
        >
          {/* Virtual container */}
          <div style={{ height: totalHeight, position: "relative" }}>
            {/* Visible items */}
            <div
              style={{
                transform: `translateY(${offsetY}px)`,
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {visibleItems.map((track, virtualIndex) => {
                const actualIndex = Math.floor(offsetY / 80) + virtualIndex;
                return (
                  <TrackRow
                    key={`${track.id || track.rawName}-${actualIndex}`}
                    track={track}
                    index={actualIndex}
                    onPlay={onPlay}
                    onTrackInfo={onTrackInfo}
                    colorPalette={colorPalette}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer with performance info */}
      {isLargeDataset && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Virtual scrolling enabled for {tracks.length.toLocaleString()}{" "}
            tracks
          </div>
        </div>
      )}
    </div>
  );
}
