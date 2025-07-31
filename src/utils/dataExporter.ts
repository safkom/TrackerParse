import { Artist, Track, Era } from '@/types';

export interface TrackerExport {
  trackerName: string;
  docId: string;
  sourceUrl: string;
  lastUpdated: string;
  hasUpdatesPage: boolean;
  hasStatisticsPage: boolean;
  artist: Artist;
  metadata: {
    totalTracks: number;
    totalAlbums: number;
    exportVersion: string;
  };
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeMetadata?: boolean;
  flattenTracks?: boolean; // For CSV export
  selectedFields?: string[]; // For custom field selection
}

export interface CSVTrackRow {
  trackerName: string;
  era: string;
  trackId: string;
  trackName: string;
  rawName: string;
  notes: string;
  discordLink: string;
  trackLength: string;
  fileDate: string;
  leakDate: string;
  availableLength: string;
  quality: string;
  links: string; // JSON string of links
  isSpecial: boolean;
  specialType: string;
  features: string; // Comma-separated
  collaborators: string; // Comma-separated
  producers: string; // Comma-separated
  references: string; // Comma-separated
  alternateNames: string; // Comma-separated
}

export class DataExporter {
  
  // Export artist data to JSON
  static exportToJSON(
    artist: Artist, 
    docId: string,
    sourceUrl: string,
    options: ExportOptions = { format: 'json' }
  ): string {
    const exportData: TrackerExport = {
      trackerName: artist.name,
      docId,
      sourceUrl,
      lastUpdated: new Date().toISOString(),
      hasUpdatesPage: !!artist.updates,
      hasStatisticsPage: !!artist.statistics,
      artist,
      metadata: {
        totalTracks: artist.albums.reduce((sum, album) => sum + album.tracks.length, 0),
        totalAlbums: artist.albums.length,
        exportVersion: '2.1'
      }
    };

    if (options.includeMetadata === false) {
      // Remove metadata if not wanted
      const { metadata: _metadata, ...exportDataWithoutMetadata } = exportData;
      return JSON.stringify(exportDataWithoutMetadata, null, 2);
    }

    return JSON.stringify(exportData, null, 2);
  }

  // Export artist data to CSV
  static exportToCSV(
    artist: Artist,
    docId: string,
    _options: ExportOptions = { format: 'csv', flattenTracks: true }
  ): string {
    const tracks: CSVTrackRow[] = [];

    // Flatten all tracks across eras
    artist.albums.forEach((era: Era) => {
      era.tracks.forEach((track: Track) => {
        const csvRow: CSVTrackRow = {
          trackerName: artist.name,
          era: era.name,
          trackId: track.id,
          trackName: track.title.main,
          rawName: track.rawName,
          notes: track.notes || '',
          discordLink: track.discordLink || '',
          trackLength: track.trackLength || '',
          fileDate: track.fileDate || '',
          leakDate: track.leakDate || '',
          availableLength: track.availableLength || '',
          quality: track.quality || '',
          links: JSON.stringify(track.links || []),
          isSpecial: track.isSpecial || false,
          specialType: track.specialType || '',
          features: track.title.features?.join(', ') || '',
          collaborators: track.title.collaborators?.join(', ') || '',
          producers: track.title.producers?.join(', ') || '',
          references: track.title.references?.join(', ') || '',
          alternateNames: track.title.alternateNames?.join(', ') || ''
        };
        tracks.push(csvRow);
      });
    });

    // Convert to CSV string
    const headers = Object.keys(tracks[0] || {});
    const csvContent = [
      headers.join(','), // Header row
      ...tracks.map(track => 
        headers.map(header => {
          const value = track[header as keyof CSVTrackRow];
          // Escape quotes and wrap in quotes if contains comma or quotes
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  // Generate filename for export
  static generateFilename(artistName: string, docId: string, format: 'json' | 'csv'): string {
    const sanitizedName = artistName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${sanitizedName}_${docId}_${timestamp}.${format}`;
  }

  // Create downloadable blob
  static createDownloadBlob(content: string, format: 'json' | 'csv'): Blob {
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    return new Blob([content], { type: mimeType });
  }

  // Download file in browser
  static downloadFile(content: string, filename: string, format: 'json' | 'csv'): void {
    const blob = this.createDownloadBlob(content, format);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export with automatic download
  static exportAndDownload(
    artist: Artist,
    docId: string,
    sourceUrl: string,
    options: ExportOptions
  ): void {
    let content: string;
    let filename: string;

    if (options.format === 'json') {
      content = this.exportToJSON(artist, docId, sourceUrl, options);
      filename = this.generateFilename(artist.name, docId, 'json');
    } else {
      content = this.exportToCSV(artist, docId, options);
      filename = this.generateFilename(artist.name, docId, 'csv');
    }

    this.downloadFile(content, filename, options.format);
  }

  // Get export summary
  static getExportSummary(artist: Artist): {
    totalTracks: number;
    totalEras: number;
    specialTracks: number;
    tracksWithLinks: number;
    tracksWithoutLinks: number;
  } {
    const totalTracks = artist.albums.reduce((sum, album) => sum + album.tracks.length, 0);
    const specialTracks = artist.albums.reduce((sum, album) => 
      sum + album.tracks.filter(track => track.isSpecial).length, 0
    );
    const tracksWithLinks = artist.albums.reduce((sum, album) => 
      sum + album.tracks.filter(track => track.links && track.links.length > 0).length, 0
    );

    return {
      totalTracks,
      totalEras: artist.albums.length,
      specialTracks,
      tracksWithLinks,
      tracksWithoutLinks: totalTracks - tracksWithLinks
    };
  }
}
