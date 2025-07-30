export interface Track {
  era: string;
  name: string;
  linkToGoogleDoc: string;
  notes: string;
  discordLink: string;
  trackLength: string;
  fileDate: string;
  leakDate: string;
  availableLength: string;
  quality: string;
  links: string[];
}

export interface Album {
  id: string;
  name: string;
  picture: string;
  description: string;
  tracks: Track[];
}

export interface Artist {
  id: string;
  name: string;
  albums: Album[];
  lastUpdated: string;
}

export interface CachedData {
  [googleDocId: string]: Artist;
}

export interface ParsedSpreadsheetData {
  artist: Artist;
  error?: string;
}
