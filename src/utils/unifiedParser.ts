import axios from 'axios';
import Papa from 'papaparse';
import { Artist, Album, Track, TrackTitle, TrackLink, TrackerStatistics } from '@/types';

/**
 * Unified Google Sheets Parser
 * Combines the best features of HtmlParser and ImprovedParser while removing complexity
 */
export class UnifiedParser {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private static readonly REQUEST_TIMEOUT = 30000;

  /**
   * Extract document ID from Google Sheets URL
   */
  static getDocumentId(googleSheetsUrl: string): string {
    const match = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Invalid Google Sheets URL format');
    }
    return match[1];
  }

  /**
   * Convert Google Sheets URL to CSV export URL
   */
  static getCSVUrl(googleSheetsUrl: string): string {
    const docId = this.getDocumentId(googleSheetsUrl);
    
    // Extract gid from original URL if present
    const gidMatch = googleSheetsUrl.match(/[?&#]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    
    let csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
    if (gid && gid !== '0') {
      csvUrl += `&gid=${gid}`;
    }
    
    return csvUrl;
  }

  /**
   * Get document title from Google Sheets
   */
  static async getDocumentTitle(googleSheetsUrl: string): Promise<string> {
    try {
      const docId = this.getDocumentId(googleSheetsUrl);
      const response = await axios.get(`https://docs.google.com/spreadsheets/d/${docId}/edit`, {
        headers: { 'User-Agent': this.USER_AGENT },
        timeout: this.REQUEST_TIMEOUT,
      });
      
      const titleMatch = response.data.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        let title = titleMatch[1].trim();
        title = title.replace(/\s*-\s*Google\s*Sheets?\s*$/i, '');
        if (title && title !== 'Google Sheets' && !title.includes('Sign in')) {
          return title;
        }
      }
    } catch (error) {
      console.warn('Could not fetch document title:', error instanceof Error ? error.message : 'Unknown error');
    }
    return 'Unknown Tracker';
  }

  /**
   * Parse track title to extract features and metadata
   */
  static parseTrackTitle(rawTitle: string): TrackTitle {
    if (!rawTitle) {
      return {
        main: '',
        isUnknown: false,
        features: [],
        collaborators: [],
        producers: [],
        references: [],
        alternateNames: []
      };
    }

    let cleanTitle = rawTitle.trim();
    const features: string[] = [];
    const producers: string[] = [];
    const alternateNames: string[] = [];

    // Check if title contains unknown markers
    const isUnknown = cleanTitle.includes('???');

    // Extract features (ft., feat., featuring)
    const featurePattern = /\s*(?:\(|\[)?\s*(?:ft\.?|feat\.?|featuring)\s+([^)\]]+?)(?:\)|\])?$/gi;
    let match = featurePattern.exec(cleanTitle);
    if (match) {
      const featList = match[1].split(/[,&]/);
      features.push(...featList.map(f => f.trim()).filter(f => f));
      cleanTitle = cleanTitle.replace(match[0], '').trim();
    }

    // Extract producers (prod., produced by)
    const producerPattern = /\s*(?:\(|\[)?\s*(?:prod\.?|produced by)\s+([^)\]]+?)(?:\)|\])?$/gi;
    match = producerPattern.exec(cleanTitle);
    if (match) {
      const prodList = match[1].split(/[,&]/);
      producers.push(...prodList.map(p => p.trim()).filter(p => p));
      cleanTitle = cleanTitle.replace(match[0], '').trim();
    }

    // Extract alternate names in parentheses or brackets
    const altNamePattern = /\s*(?:\(([^)]+)\)|\[([^\]]+)\])/g;
    let altMatch;
    while ((altMatch = altNamePattern.exec(cleanTitle)) !== null) {
      const altName = (altMatch[1] || altMatch[2]).trim();
      if (altName && !altName.match(/^\d+$/)) {
        alternateNames.push(altName);
      }
      cleanTitle = cleanTitle.replace(altMatch[0], '').trim();
    }

    // Clean main title
    const main = cleanTitle
      .replace(/[🎵🎶🎤🎧🔥💎⭐✨🏆]/g, '') // Remove emojis
      .replace(/\s+/g, ' ')
      .trim();

    return {
      main,
      isUnknown,
      features,
      collaborators: [], // Not commonly used, keeping for compatibility
      producers,
      references: [], // Not commonly used, keeping for compatibility
      alternateNames
    };
  }

  /**
   * Parse track date from various formats
   */
  static parseTrackDate(dateString: string): Date | null {
    if (!dateString?.trim()) return null;

    try {
      // Try direct parsing first
      const date = new Date(dateString.trim());
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    } catch {
      // Continue to manual parsing
    }

    return null;
  }

  /**
   * Categorize links by platform
   */
  static categorizeLink(url: string): { platform: string; type: string; isValid: boolean } {
    if (!url?.trim()) {
      return { platform: 'unknown', type: 'unknown', isValid: false };
    }

    const cleanUrl = url.trim();
    const isValid = /^https?:\/\/.+/.test(cleanUrl);
    
    let platform = 'unknown';
    let type = 'unknown';
    
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      platform = 'youtube';
      type = 'video';
    } else if (cleanUrl.includes('soundcloud.com')) {
      platform = 'soundcloud';
      type = 'audio';
    } else if (cleanUrl.includes('spotify.com')) {
      platform = 'spotify';
      type = 'stream';
    } else if (cleanUrl.includes('apple.com/music') || cleanUrl.includes('music.apple.com')) {
      platform = 'apple-music';
      type = 'stream';
    } else if (cleanUrl.includes('pillows.su') || cleanUrl.includes('pillowcase.su')) {
      platform = 'pillowcase';
      type = 'audio';
    }

    return { platform, type, isValid };
  }

  /**
   * Find header row and create column mapping
   */
  static findHeaderRow(rows: string[][]): { headerIndex: number; columnMap: Record<string, number> } {
    const columnMap: Record<string, number> = {};
    let headerIndex = -1;

    // Look for a row containing common column names
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      const lowerRow = row.map(cell => cell?.toLowerCase().trim() || '');
      
      let matchCount = 0;
      const tempMap: Record<string, number> = {};

      lowerRow.forEach((cell, index) => {
        console.log(`Checking cell ${index}: "${cell}"`);
        if (cell.includes('era') || cell.includes('album')) {
          tempMap['era'] = index;
          matchCount++;
          console.log(`  -> Matched 'era' at index ${index}`);
        } else if (cell === 'name' || cell.startsWith('name') || cell.includes('song title') || cell.includes('track title')) {
          tempMap['name'] = index;
          matchCount++;
          console.log(`  -> Matched 'name' at index ${index}`);
        } else if (cell.includes('notes') || cell.includes('note')) {
          tempMap['notes'] = index;
          matchCount++;
          console.log(`  -> Matched 'notes' at index ${index}`);
        } else if ((cell.includes('track') && cell.includes('length')) || cell.includes('duration')) {
          tempMap['trackLength'] = index;
          matchCount++;
          console.log(`  -> Matched 'trackLength' at index ${index}`);
        } else if (cell.includes('leak') && cell.includes('date')) {
          tempMap['leakDate'] = index;
          matchCount++;
          console.log(`  -> Matched 'leakDate' at index ${index}`);
        } else if (cell.includes('file') && cell.includes('date')) {
          tempMap['fileDate'] = index;
          matchCount++;
          console.log(`  -> Matched 'fileDate' at index ${index}`);
        } else if (cell.includes('quality')) {
          tempMap['quality'] = index;
          matchCount++;
          console.log(`  -> Matched 'quality' at index ${index}`);
        } else if (cell.includes('link') || cell.includes('url')) {
          tempMap['links'] = index;
          matchCount++;
          console.log(`  -> Matched 'links' at index ${index}`);
        }
      });

      // If we found enough column matches, this is likely the header
      if (matchCount >= 3) {
        headerIndex = i;
        Object.assign(columnMap, tempMap);
        break;
      }
    }

    return { headerIndex, columnMap };
  }

  /**
   * Parse CSV data into structured format
   */
  static async parseCSVData(csvData: string): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          resolve(results.data as string[][]);
        },
        error: (error: any) => reject(error),
        skipEmptyLines: true
      });
    });
  }

  /**
   * Main parsing method
   */
  static async parseGoogleDoc(googleSheetsUrl: string): Promise<Artist> {
    try {
      console.log(`Parsing Google Sheets: ${googleSheetsUrl}`);
      
      // Get CSV URL and fetch data
      const csvUrl = this.getCSVUrl(googleSheetsUrl);
      console.log(`Fetching CSV from: ${csvUrl}`);

      const response = await axios.get(csvUrl, {
        headers: { 'User-Agent': this.USER_AGENT },
        timeout: this.REQUEST_TIMEOUT,
      });

      if (!response.data) {
        throw new Error('No data received from Google Sheets');
      }

      // Parse CSV data
      const rows = await this.parseCSVData(response.data);
      console.log(`Parsed ${rows.length} rows from CSV`);
      console.log('First 5 rows:', rows.slice(0, 5));

      if (rows.length === 0) {
        throw new Error('No data found in spreadsheet');
      }

      // Find header row and column mapping
      const { headerIndex, columnMap } = this.findHeaderRow(rows);
      
      console.log(`Header search results: headerIndex=${headerIndex}, columnMap=`, columnMap);
      
      if (headerIndex === -1) {
        console.log('Header not found. First 10 rows for debugging:');
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          console.log(`Row ${i}:`, rows[i]);
        }
        throw new Error('Could not find header row in spreadsheet');
      }

      console.log(`Found header at row ${headerIndex}:`, rows[headerIndex]);

      // Parse sheet data
      const albums = this.parseSheetData(rows, columnMap, headerIndex + 1);
      
      // Get document title and extract artist name
      const documentTitle = await this.getDocumentTitle(googleSheetsUrl);
      const artistName = documentTitle.replace(/tracker/i, '').trim() || 'Unknown Artist';

      console.log(`Parsed ${albums.length} albums for artist: ${artistName}`);

      return {
        name: artistName,
        albums,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error parsing Google Sheets:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new Error('Access denied. The Google Sheet may not be publicly accessible.');
        } else if (error.response?.status === 404) {
          throw new Error('Google Sheet not found. Please check the URL.');
        }
      }
      
      throw new Error(`Failed to parse Google Sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse sheet data into albums and tracks
   */
  private static parseSheetData(rows: string[][], columnMap: Record<string, number>, startRow: number): Album[] {
    console.log(`🔄 parseSheetData: Processing ${rows.length} rows starting from row ${startRow}`);
    console.log('🗂️ Column mapping:', columnMap);
    
    const albums: Album[] = [];
    let currentAlbum: Album | null = null;
    let currentEraName = '';
    
    // Find where data ends (statistics section)
    let dataEndRow = rows.length;
    for (let i = startRow; i < rows.length; i++) {
      const firstCell = rows[i]?.[0]?.toLowerCase() || '';
      // Look for actual statistics keywords
      if (firstCell.includes('total tracks') || firstCell.includes('total files') || 
          firstCell.includes('statistic') || firstCell.includes('last updated') ||
          firstCell.match(/^\d+\s+(total|files|tracks|links)/)) {
        dataEndRow = i;
        console.log(`📊 Found statistics section at row ${i}: "${firstCell}"`);
        break;
      }
    }
    
    console.log(`📊 Data processing range: rows ${startRow} to ${dataEndRow} (${dataEndRow - startRow} rows)`);

    // Process data rows
    for (let i = startRow; i < dataEndRow; i++) {
      const row = rows[i];
      
      if (!row || row.every(cell => !cell?.trim())) {
        continue; // Skip empty rows
      }

      const eraCol = row[columnMap['era'] || 0]?.trim() || '';
      const nameCol = row[columnMap['name'] || 1]?.trim() || '';

      console.log(`📋 Row ${i}: eraCol="${eraCol}", nameCol="${nameCol}"`);

      // Skip obvious non-data rows (Discord messages, statistics, etc.)
      if (eraCol && !nameCol) {
        // Check if this looks like a message/announcement rather than an era
        if (eraCol.toLowerCase().includes('discord') || 
            eraCol.toLowerCase().includes('tracker') ||
            eraCol.toLowerCase().includes('server') ||
            eraCol.toLowerCase().includes('join') ||
            eraCol.includes('http') ||
            // Statistics pattern like "1 OG File(s)\n42 Full\n1 Tagged..."
            eraCol.match(/^\d+\s*og\s*file/i) ||
            eraCol.match(/\d+\s*(full|tagged|partial|snippet|stem|bounce|unavailable)/i) ||
            // General statistics patterns
            eraCol.match(/^\d+\s*(og|full|tagged|partial|snippet|stem|bounce|unavailable)/i)) {
          console.log(`⏭️  Skipping non-data row: "${eraCol}"`);
          continue;
        }
      }

      // Also check for statistics in Era column even when Name column exists
      if (eraCol && nameCol) {
        // Check if Era column contains statistics info
        if (eraCol.match(/^\d+\s*og\s*file/i) ||
            eraCol.match(/\d+\s*(full|tagged|partial|snippet|stem|bounce|unavailable)/i)) {
          console.log(`⏭️  Skipping statistics row with era stats: "${eraCol}" and name: "${nameCol}"`);
          // Use the name as the new era instead
          if (!currentEraName) {
            currentEraName = nameCol;
            console.log(`🎵 Setting era from name column: ${nameCol}`);
          }
          continue;
        }
      }

      // Handle track rows
      if (nameCol) {
        // Determine the era for this track
        let trackEra = currentEraName;
        
        if (eraCol) {
          // This row has both era and name - update current era
          currentEraName = eraCol;
          trackEra = eraCol;
        }
        
        // If we don't have an era yet, skip this track
        if (!trackEra) {
          console.log(`⏭️  Skipping track without era: "${nameCol}"`);
          continue;
        }

        // Find or create album for this era
        if (!currentAlbum || currentAlbum.name !== trackEra) {
          // Start new album
          if (currentAlbum) {
            albums.push(currentAlbum);
            console.log(`✅ Completed album: ${currentAlbum.name} with ${currentAlbum.tracks.length} tracks`);
          }
          
          console.log(`🎵 Starting new album: ${trackEra}`);
          
          currentAlbum = {
            id: `album-${albums.length}`,
            name: trackEra,
            picture: '',
            description: '',
            tracks: [],
            metadata: {
              ogFiles: 0,
              fullFiles: 0,
              taggedFiles: 0,
              partialFiles: 0,
              snippetFiles: 0,
              stemBounceFiles: 0,
              unavailableFiles: 0
            },
            notes: ''
          };
        }

        console.log(`🎵 Adding track: ${nameCol} to album: ${currentAlbum.name}`);
        
        const parsedTitle = this.parseTrackTitle(nameCol);
        const notes = row[columnMap['notes'] || 2] || '';
        const trackLength = row[columnMap['trackLength'] || 3] || '';
        const fileDate = row[columnMap['fileDate'] || 4] || '';
        const leakDate = row[columnMap['leakDate'] || 5] || '';
        const availableLength = row[columnMap['availableLength'] || 6] || '';
        const quality = row[columnMap['quality'] || 7] || '';
        const linksText = row[columnMap['links'] || 8] || '';
        
        // Process links
        const links: TrackLink[] = [];
        if (linksText) {
          const linkUrls = linksText.split(/[,\n]/).map(l => l.trim()).filter(l => l);
          for (const url of linkUrls) {
            const linkInfo = this.categorizeLink(url);
            links.push({
              url,
              type: linkInfo.type as TrackLink['type'],
              platform: linkInfo.platform,
              isValid: linkInfo.isValid
            });
          }
        }

        const track: Track = {
          id: `${currentAlbum.name}-${nameCol}-${currentAlbum.tracks.length}`,
          era: currentAlbum.name,
          title: parsedTitle,
          rawName: nameCol,
          notes,
          trackLength,
          fileDate: this.parseTrackDate(fileDate)?.toISOString().split('T')[0] || fileDate,
          leakDate: this.parseTrackDate(leakDate)?.toISOString().split('T')[0] || leakDate,
          availableLength,
          quality,
          links,
          isSpecial: nameCol.includes('⭐') || nameCol.includes('✨') || nameCol.includes('🏆'),
          specialType: nameCol.includes('⭐') ? '⭐' : 
                      nameCol.includes('✨') ? '✨' : 
                      nameCol.includes('🏆') ? '🏆' : undefined,
          isWanted: nameCol.includes('🥇') || nameCol.includes('🥈') || nameCol.includes('🥉'),
          wantedType: nameCol.includes('🥇') ? '🥇' : 
                     nameCol.includes('🥈') ? '🥈' : 
                     nameCol.includes('🥉') ? '🥉' : undefined
        };

        currentAlbum.tracks.push(track);
        
        // Update metadata based on quality
        const qualityLower = quality.toLowerCase();
        if (qualityLower.includes('og') || qualityLower.includes('original')) {
          currentAlbum.metadata.ogFiles++;
        } else if (qualityLower.includes('high quality') || qualityLower.includes('full')) {
          currentAlbum.metadata.fullFiles++;
        } else if (qualityLower.includes('tagged')) {
          currentAlbum.metadata.taggedFiles++;
        } else if (qualityLower.includes('partial')) {
          currentAlbum.metadata.partialFiles++;
        } else if (qualityLower.includes('snippet')) {
          currentAlbum.metadata.snippetFiles++;
        } else if (qualityLower.includes('stem') || qualityLower.includes('bounce')) {
          currentAlbum.metadata.stemBounceFiles++;
        } else if (qualityLower.includes('not available') || qualityLower.includes('unavailable')) {
          currentAlbum.metadata.unavailableFiles++;
        } else {
          // Default to full if no specific quality detected
          currentAlbum.metadata.fullFiles++;
        }
        
        console.log(`➕ Added track: ${nameCol} (${currentAlbum.tracks.length} total tracks in ${currentAlbum.name})`);
      }
    }

    // Add the last album
    if (currentAlbum) {
      albums.push(currentAlbum);
      console.log(`✅ Completed final album: ${currentAlbum.name} with ${currentAlbum.tracks.length} tracks`);
    }
    
    console.log(`🎯 Total albums parsed: ${albums.length}`);
    albums.forEach((album, i) => {
      console.log(`  Album ${i + 1}: ${album.name} (${album.tracks.length} tracks)`);
    });

    return albums.filter(album => album.tracks.length > 0);
  }
}
