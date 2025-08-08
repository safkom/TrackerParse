"use client";

import React, { useState, useEffect } from "react";
import { Track } from "@/types";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "@/app/modern-player.css";

interface ModernMusicPlayerProps {
  track: Track | null;
  isVisible: boolean;
  onClose: () => void;
}

export default function ModernMusicPlayer({
  track,
  isVisible,
  onClose,
}: ModernMusicPlayerProps) {
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);

  // Enhanced: Find playable link and type
  const getPlayableSource = (
    track: Track,
  ): { type: string; url: string; id?: string; isVideo?: boolean } | null => {
    if (!track.links || track.links.length === 0) return null;

    for (const link of track.links) {
      const url = typeof link === "string" ? link : link.url;

      // Pillowcase API (pillows.su, pillowcase.su, pillowcases.su, pillowcases.top)
      if (url.match(/pillow(case)?s?\.(su|top)/i)) {
        let match = url.match(/\/f\/([a-f0-9]{32})/i);
        if (!match) {
          match = url.match(/([a-f0-9]{32})/i);
        }
        if (match) {
          const id = match[1];
          return {
            type: "pillowcase",
            url: `https://api.pillows.su/api/download/${id}.mp3`,
            id,
          };
        }
      }

      // Music.froste.lol support
      if (url.match(/music\.froste\.lol/i)) {
        const downloadUrl = url.endsWith("/")
          ? `${url}download`
          : `${url}/download`;
        return { type: "froste", url: downloadUrl };
      }

      // YouTube (supports audio-only mode)
      if (url.match(/(youtube\.com|youtu\.be)/i)) {
        return { type: "youtube", url, isVideo: true };
      }

      // SoundCloud
      if (url.includes("soundcloud.com")) {
        return { type: "soundcloud", url };
      }

      // Vimeo
      if (url.includes("vimeo.com")) {
        return { type: "vimeo", url, isVideo: true };
      }

      // Direct video files
      if (url.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i)) {
        return { type: "video", url, isVideo: true };
      }

      // Direct audio files
      if (url.match(/\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i)) {
        return { type: "audio", url };
      }

      // Twitch
      if (url.includes("twitch.tv")) {
        return { type: "twitch", url, isVideo: true };
      }

      // Facebook Video
      if (url.includes("facebook.com") && url.includes("video")) {
        return { type: "facebook", url, isVideo: true };
      }

      // DailyMotion
      if (url.includes("dailymotion.com")) {
        return { type: "dailymotion", url, isVideo: true };
      }
    }

    // Fallback: first link
    return { type: "other", url: track.links[0].url };
  };

  const playable = track ? getPlayableSource(track) : null;
  const isPillowcase = playable?.type === "pillowcase";
  const isVideo = playable?.isVideo || false;
  const canUseReactPlayer =
    playable &&
    [
      "youtube",
      "soundcloud",
      "vimeo",
      "twitch",
      "facebook",
      "dailymotion",
      "video",
    ].includes(playable.type);
  const canUseAudioPlayer =
    playable && ["audio", "pillowcase", "froste"].includes(playable.type);

  // Auto-enable audio-only mode for video content by default
  useEffect(() => {
    if (isVideo) {
      setAudioOnlyMode(true);
    }
  }, [isVideo]);

  if (!isVisible || !track || !playable) return null;

  const renderPlayer = () => {
    if (canUseReactPlayer) {
      return (
        <div className="space-y-4">
          {/* Video/Audio Player */}
          <div
            className={`relative ${isVideo && !audioOnlyMode ? "aspect-video" : "h-16"} bg-black rounded-lg overflow-hidden`}
          >
            {/* ReactPlayer temporarily disabled for build */}
            <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-700 rounded">
              <p className="text-gray-600 dark:text-gray-400">
                Video/Audio player disabled for build
              </p>
            </div>
            {isVideo && audioOnlyMode && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                <div className="text-center text-white">
                  <svg
                    className="w-12 h-12 mx-auto mb-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-medium">Audio Only Mode</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Controls */}
          {isVideo && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setAudioOnlyMode(!audioOnlyMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  audioOnlyMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {audioOnlyMode ? "🎵 Audio Only" : "🎥 Show Video"}
              </button>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {playable.type.charAt(0).toUpperCase() + playable.type.slice(1)}{" "}
                Player
              </div>
            </div>
          )}
        </div>
      );
    }

    if (canUseAudioPlayer) {
      return (
        <div className="space-y-4">
          <AudioPlayer
            src={playable.url}
            autoPlay={false}
            showJumpControls={true}
            showSkipControls={false}
            showDownloadProgress={true}
            showFilledProgress={true}
            customAdditionalControls={[]}
            customVolumeControls={[]}
            layout="horizontal-reverse"
            className="modern-audio-player"
            style={{
              backgroundColor: "transparent",
              boxShadow: "none",
            }}
          />

          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            High-quality audio playback
          </div>
        </div>
      );
    }

    // Fallback for unsupported formats
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          This format requires an external player
        </div>
        <button
          onClick={() =>
            window.open(playable.url, "_blank", "noopener,noreferrer")
          }
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Open External Link
        </button>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg z-40 pb-safe">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="space-y-4">
          {/* Header with track info and controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                {isVideo ? (
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                  {track.title?.main || track.rawName}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {track.era} • {isVideo ? "Video" : "Audio"} • {playable.type}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 sm:w-11 sm:h-11 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95"
                aria-label="Close player"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Player */}
          {renderPlayer()}
        </div>
      </div>
    </div>
  );
}
