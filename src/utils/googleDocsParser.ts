import axios from 'axios';
import Papa from 'papaparse';
import { Artist, Album, Track } from '@/types';

export class GoogleDocsParser {
  // Convert Google Docs URL to CSV export URL
  static getCSVUrl(googleDocsUrl: string): string {
    // Extract the document ID from various Google Docs URL formats
    let docId = '';
    
    // Handle different URL formats
    if (googleDocsUrl.includes('/d/')) {
      const match = googleDocsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        docId = match[1];
      }
    } else if (googleDocsUrl.includes('id=')) {
      const match = googleDocsUrl.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) {
        docId = match[1];
      }
    }
    
    if (!docId) {
      throw new Error('Invalid Google Docs URL format');
    }
    
    // Return CSV export URL
    return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
  }

  // Extract document ID from Google Docs URL
  static getDocumentId(googleDocsUrl: string): string {
    let docId = '';
    
    if (googleDocsUrl.includes('/d/')) {
      const match = googleDocsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        docId = match[1];
      }
    } else if (googleDocsUrl.includes('id=')) {
      const match = googleDocsUrl.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) {
        docId = match[1];
      }
    }
    
    if (!docId) {
      throw new Error('Invalid Google Docs URL format');
    }
    
    return docId;
  }

  // Parse CSV data into structured format
  static parseCSVData(csvData: string): Artist {
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    if (results.errors.length > 0) {
      console.error('CSV parsing errors:', results.errors);
    }

    const rows = results.data as Record<string, string>[];
    
    if (rows.length === 0) {
      throw new Error('No data found in the spreadsheet');
    }

    // Group tracks by album/era
    const albumMap = new Map<string, Track[]>();
    let artistName = '';

    rows.forEach((row) => {
      // Skip header rows or empty rows
      if (!row.Era && !row.Name) return;

      // Extract artist name from first valid row if not set
      if (!artistName && row.Name) {
        // Assume artist name is extracted from context or set manually
        artistName = 'Unknown Artist'; // This should be improved based on actual data structure
      }

      const track: Track = {
        era: row.Era || '',
        name: row.Name || '',
        linkToGoogleDoc: row['Link to google doc'] || '',
        notes: row.Notes || '',
        discordLink: row['Discord link'] || '',
        trackLength: row['Track Length'] || '',
        fileDate: row['File Date'] || '',
        leakDate: row['Leak Date'] || '',
        availableLength: row['Available Length'] || '',
        quality: row.Quality || '',
        links: row['Link(s)'] ? row['Link(s)'].split(',').map((link: string) => link.trim()) : [],
      };

      const albumKey = row.Era || 'Unknown Album';
      if (!albumMap.has(albumKey)) {
        albumMap.set(albumKey, []);
      }
      albumMap.get(albumKey)!.push(track);
    });

    // Convert map to albums array
    const albums: Album[] = Array.from(albumMap.entries()).map(([albumName, tracks], index) => ({
      id: `album-${index}`,
      name: albumName,
      picture: '/placeholder-album.jpg', // Placeholder - should be extracted from data
      description: `${tracks.length} tracks`, // Basic description
      tracks,
    }));

    return {
      id: `artist-${Date.now()}`,
      name: artistName,
      albums,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Main parsing method
  static async parseGoogleDoc(googleDocsUrl: string): Promise<Artist> {
    try {
      const csvUrl = this.getCSVUrl(googleDocsUrl);
      
      // Fetch CSV data
      const response = await axios.get(csvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrackerHub/1.0)',
        },
        timeout: 10000,
      });

      if (!response.data) {
        throw new Error('No data received from Google Docs');
      }

      return this.parseCSVData(response.data);
    } catch (error) {
      console.error('Error parsing Google Doc:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new Error('Access denied. The Google Doc may not be publicly accessible.');
        } else if (error.response?.status === 404) {
          throw new Error('Google Doc not found. Please check the URL.');
        }
      }
      throw new Error(`Failed to parse Google Doc: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
