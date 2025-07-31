export interface TrackTitle {
  main: string;
  isUnknown: boolean; // true if title contains "???"
  features: string[]; // feat. artists
  collaborators: string[]; // "with" artists
  producers: string[]; // production credits
  references: string[]; // "ref." references
  alternateNames: string[]; // alternate track names
}

export interface Track {
  id: string;
  era: string;
  title: TrackTitle;
  rawName: string; // original name from spreadsheet
  notes: string;
  discordLink?: string;
  trackLength: string;
  fileDate: string;
  leakDate: string;
  availableLength: string;
  quality: string;
  links: TrackLink[];
  isSpecial: boolean; // has 🏆 or ✨ emoji
  specialType?: '🏆' | '✨' | '⭐';
}

export interface TrackLink {
  url: string;
  label?: string;
  type?: 'audio' | 'video' | 'download' | 'stream';
}

export interface EraMetadata {
  ogFiles: number;
  fullFiles: number;
  taggedFiles: number;
  partialFiles: number;
  snippetFiles: number;
  stemBounceFiles: number;
  unavailableFiles: number;
}

export interface Era {
  id: string;
  name: string;
  alternateNames?: string[]; // alternate era names in parentheses
  metadata: EraMetadata;
  notes: string; // timeline information and sub-era notes
  image?: string;
  description: string; // main era description
  tracks: Track[];
  year?: number;
}

export interface TrackerEditor {
  name: string;
  role?: string;
}

export interface TrackerStats {
  totalTracks: number;
  totalEras: number;
  specialTracks: number;
  recentLeaks: number;
  lastUpdated: string;
}

export interface UpdateEntry {
  date: string;
  description: string;
  type: 'leak' | 'update' | 'addition' | 'removal';
}

export interface StatEntry {
  label: string;
  value: number;
  type: string;
}

export interface TrackerStatistics {
  links: {
    total: number;
    missing: number;
    sourcesNeeded: number;
    notAvailable: number;
  };
  quality: {
    lossless: number;
    cdQuality: number;
    highQuality: number;
    lowQuality: number;
    recordings: number;
    notAvailable: number;
  };
  availability: {
    totalFull: number;
    ogFiles: number;
    stemBounces: number;
    full: number;
    tagged: number;
    partial: number;
    snippets: number;
    unavailable: number;
  };
  highlighted: {
    bestOf: number;
    special: number;
    wanted: number;
  };
}

export interface Tracker {
  id: string; // tracker URL/ID
  name: string; // artist name
  discordLink?: string;
  editors: TrackerEditor[];
  stats: TrackerStats;
  eras: Era[];
  updates?: UpdateEntry[];
  statistics?: StatEntry[];
  lastUpdated: string;
}

// Legacy interfaces for backward compatibility
export interface Album extends Era {
  // Legacy Album interface - use Era instead
  picture?: string; // Added for backward compatibility
} 

export interface Artist {
  name: string;
  picture?: string;
  description?: string;
  albums: Album[];
  updates?: UpdateEntry[];
  statistics?: StatEntry[] | TrackerStatistics;
  lastUpdated: string;
}

export interface CacheMetadata {
  lastModified?: string;
  etag?: string;
  contentLength?: number;
  fetchedAt: string;
}

export interface TrackerConfig {
  name: string;
  hasUpdatesPage: boolean;
  hasStatisticsPage: boolean;
  columnMappings: Record<string, string[]>;
  eraPatterns: string[];
  footerPatterns: string[];
}

export interface CachedArtist extends Artist {
  cacheMetadata: CacheMetadata;
  config?: TrackerConfig;
}

export interface CachedData {
  [googleDocId: string]: CachedArtist;
}

export interface ParsedSpreadsheetData {
  artist: Artist;
  hasUpdatesPage?: boolean;
  hasStatisticsPage?: boolean;
  error?: string;
}
