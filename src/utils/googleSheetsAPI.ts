import { google, sheets_v4 } from 'googleapis';
import { Artist, Album, Track, TrackTitle, TrackLink } from '@/types';

/**
 * Google Sheets API Parser
 * Uses the official Google Sheets API for reliable data access
 */
export class GoogleSheetsAPIParser {
  private static sheets: sheets_v4.Sheets;
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Initialize the Google Sheets API client
   */
  private static initializeAPI() {
    if (!this.sheets) {
      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('Google Sheets API key is required. Please set GOOGLE_SHEETS_API_KEY in your .env.local file.');
      }
      
      this.sheets = google.sheets({
        version: 'v4',
        auth: apiKey
      });
    }
    return this.sheets;
  }

  /**
   * Extract spreadsheet ID from Google Sheets URL
   */
  static getSpreadsheetId(googleSheetsUrl: string): string {
    const match = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Invalid Google Sheets URL format');
    }
    return match[1];
  }

  /**
   * Get spreadsheet metadata including title and sheet names
   */
  static async getSpreadsheetMetadata(spreadsheetId: string): Promise<{
    title: string;
    sheets: Array<{ title: string; sheetId: number }>;
  }> {
    const sheets = this.initializeAPI();
    
    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties(title,sheetId)'
      });

      const spreadsheet = response.data;
      return {
        title: spreadsheet.properties?.title || 'Unknown Tracker',
        sheets: spreadsheet.sheets?.map(sheet => ({
          title: sheet.properties?.title || 'Sheet1',
          sheetId: sheet.properties?.sheetId || 0
        })) || []
      };
    } catch (error) {
      console.error('Error fetching spreadsheet metadata:', error);
      throw new Error('Failed to fetch spreadsheet metadata. Make sure the sheet is publicly accessible.');
    }
  }

  /**
   * Get all data from a specific sheet using the API
   */
  static async getSheetDataViaAPI(spreadsheetId: string, sheetName: string = 'Sheet1'): Promise<string[][]> {
    const sheets = this.initializeAPI();
    
    try {
      // Try different range formats to handle access issues
      let response;
      
      try {
        // First try without any range - get all data
        console.log(`🔍 Trying no range specification`);
        
        response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: '',
          valueRenderOption: 'FORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING'
        });
      } catch (noRangeError) {
        console.log(`🔄 No range failed, trying explicit range: ${sheetName}!A:ZZ`);
        try {
          // Try with explicit range
          const escapedSheetName = sheetName.includes(' ') ? `'${sheetName}'` : sheetName;
          const range = `${escapedSheetName}!A:ZZ`;
          
          response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            valueRenderOption: 'FORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING'
          });
        } catch (rangeError) {
          console.log(`🔄 Range failed, trying simple sheet name: ${sheetName}`);
          // Fallback to just sheet name
          response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: sheetName,
            valueRenderOption: 'FORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING'
          });
        }
      }

      // Ensure proper string conversion and Unicode handling
      const values = response.data.values || [];
      return values.map(row => 
        row.map(cell => {
          if (cell === null || cell === undefined) return '';
          // Ensure proper Unicode string handling
          return String(cell).normalize('NFC'); // Normalize Unicode to composed form
        })
      );
    } catch (error) {
      console.error('Error fetching sheet data via API:', error);
      throw new Error('Failed to fetch sheet data via API. Make sure the sheet is publicly accessible.');
    }
  }

  /**
   * Get all available sheets from a Google Spreadsheet using Google Sheets API
   */
  static async getAvailableSheets(spreadsheetId: string): Promise<Array<{ title: string; gid: string }>> {
    try {
      const sheets = this.initializeAPI();
      
      // Use the official API to get spreadsheet metadata
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title,sheets.properties.sheetId'
      });
      
      if (!response.data.sheets) {
        console.warn('No sheets found in spreadsheet');
        return [{ title: 'Sheet1', gid: '0' }];
      }
      
      const sheetList = response.data.sheets.map(sheet => ({
        title: sheet.properties?.title || 'Sheet1',
        gid: sheet.properties?.sheetId?.toString() || '0'
      }));
      
      console.log(`Found ${sheetList.length} sheets:`, sheetList);
      return sheetList;
      
    } catch (error) {
      console.warn('Could not get sheet list via API, using fallback:', error);
      
      // Fallback to HTML scraping method
      try {
        // Use the edit URL to get sheet information
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, {
          headers: { 'User-Agent': this.USER_AGENT },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to access spreadsheet: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Extract sheet information from the HTML
        const sheets: Array<{ title: string; gid: string }> = [];
        
        // Look for sheet data in various formats
        const sheetMatches = html.matchAll(/"sheets":\[([^\]]+)\]/g);
        for (const match of sheetMatches) {
          try {
            const sheetsData = `[${match[1]}]`;
            const parsed = JSON.parse(sheetsData);
            for (const sheet of parsed) {
              if (sheet.properties) {
                sheets.push({
                  title: sheet.properties.title || 'Sheet1',
                  gid: sheet.properties.sheetId?.toString() || '0'
                });
              }
            }
          } catch (e) {
            // Continue with fallback methods
          }
        }
        
        // Fallback: look for simpler patterns
        if (sheets.length === 0) {
          const titleMatches = html.matchAll(/"title":"([^"]+)","sheetId":(\d+)/g);
          for (const match of titleMatches) {
            sheets.push({
              title: match[1],
              gid: match[2]
            });
          }
        }
        
        // Ultimate fallback: assume default sheet
        if (sheets.length === 0) {
          sheets.push({ title: 'Sheet1', gid: '0' });
        }
        
        console.log(`Found ${sheets.length} sheets:`, sheets);
        return sheets;
      } catch (fallbackError) {
        console.error('Error getting available sheets:', fallbackError);
        // Return default sheet as fallback
        return [{ title: 'Sheet1', gid: '0' }];
      }
    }
  }

  /**
   * DEPRECATED: Use getSheetDataViaAPI instead
   * This method used CSV export which has been replaced with official Google Sheets API
   */
  static async getSheetData(spreadsheetId: string, gid: string = '0'): Promise<string[][]> {
    throw new Error('getSheetData is deprecated. Use getSheetDataViaAPI instead.');
  }

  /**
   * Get spreadsheet title from the HTML page
   */
  static async getSpreadsheetTitle(spreadsheetId: string): Promise<string> {
    try {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, {
        headers: { 'User-Agent': this.USER_AGENT },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to access spreadsheet: ${response.status}`);
      }
      
      const html = await response.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      
      if (titleMatch && titleMatch[1]) {
        let title = titleMatch[1].trim();
        // Remove Google Sheets indicators
        title = title.replace(/\s*-\s*Google\s*(Sheets?|Preglednice|Planilhas|Feuilles|Hojas|Tabele|Táblázatok|Spreadsheets|Arkusze|Folhas|Tabelki|Листы)\s*$/gi, '');
        if (title && title !== 'Google Sheets' && !title.includes('Sign in')) {
          return title;
        }
      }
    } catch (error) {
      console.warn('Could not fetch spreadsheet title:', error);
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

    // Enhanced Unicode handling to fix broken emoji sequences
    let cleanTitle = rawTitle
      .normalize('NFC') // Normalize Unicode to composed form
      .trim();
    
    // Fix common broken Unicode patterns
    cleanTitle = cleanTitle
      // Fix broken emoji sequences (like �️🤖)
      .replace(/�+/g, '') // Remove replacement characters
      .replace(/\uFFFD+/g, '') // Remove Unicode replacement characters
      // Fix specific broken patterns that commonly occur
      .replace(/�️/g, '') // Remove broken variation selector
      .replace(/\u{FE0F}/gu, '') // Remove variation selector-16
      .replace(/\u{200D}/gu, '') // Remove zero-width joiner
      // Clean up multiple spaces that might result from character removal
      .replace(/\s+/g, ' ')
      .trim();

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

    // Extract alternate names in parentheses or brackets (but not features/producers)
    const altNamePattern = /\s*(?:\(([^)]+)\)|\[([^\]]+)\])/g;
    let altMatch;
    while ((altMatch = altNamePattern.exec(cleanTitle)) !== null) {
      const altName = (altMatch[1] || altMatch[2]).trim();
      // Skip if it looks like a feature or producer credit
      if (altName && !altName.match(/^\d+$/) && 
          !altName.toLowerCase().includes('feat') && 
          !altName.toLowerCase().includes('prod')) {
        alternateNames.push(altName);
      }
      cleanTitle = cleanTitle.replace(altMatch[0], '').trim();
    }

    // Clean main title and preserve valid Unicode characters while removing broken ones
    const main = cleanTitle
      // Remove common music-related emojis that might appear broken
      .replace(/[🎵🎶🎤🎧🔥💎⭐✨🏆🤖]/g, '') 
      // Remove any remaining replacement characters
      .replace(/�/g, '')
      .replace(/\uFFFD/g, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Final Unicode normalization
      .normalize('NFC');

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
      const lowerRow = row.map(cell => {
        if (!cell) return '';
        // Normalize Unicode and convert to lowercase for comparison
        return cell.toString().normalize('NFC').toLowerCase().trim();
      });
      
      let matchCount = 0;
      const tempMap: Record<string, number> = {};

      lowerRow.forEach((cell, index) => {
        if (cell.includes('era') || cell.includes('album')) {
          tempMap['era'] = index;
          matchCount++;
        } else if (cell === 'name' || cell.startsWith('name') || cell.includes('song title') || cell.includes('track title')) {
          tempMap['name'] = index;
          matchCount++;
        } else if (cell.includes('notes') || cell.includes('note')) {
          tempMap['notes'] = index;
          matchCount++;
        } else if ((cell.includes('track') && cell.includes('length')) || cell.includes('duration')) {
          tempMap['trackLength'] = index;
          matchCount++;
        } else if (cell.includes('leak') && cell.includes('date')) {
          tempMap['leakDate'] = index;
          matchCount++;
        } else if (cell.includes('file') && cell.includes('date')) {
          tempMap['fileDate'] = index;
          matchCount++;
        } else if (cell.includes('quality')) {
          tempMap['quality'] = index;
          matchCount++;
        } else if (cell.includes('link') || cell.includes('url')) {
          tempMap['links'] = index;
          matchCount++;
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
   * Main parsing method using official Google Sheets API
   */
  static async parseGoogleSheet(googleSheetsUrl: string): Promise<Artist> {
    try {
      console.log(`Parsing Google Sheets via official API: ${googleSheetsUrl}`);
      
      const spreadsheetId = this.getSpreadsheetId(googleSheetsUrl);
      
      // Get spreadsheet metadata using the API
      const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
      console.log(`Found spreadsheet: ${metadata.title} with ${metadata.sheets.length} sheets`);
      console.log('Available sheets:', metadata.sheets.map(s => `${s.title} (${s.sheetId})`));
      
      // Find the sheet with individual track data
      // Look for sheets that likely contain track data rather than album metadata
      let targetSheet = metadata.sheets[0]; // fallback to first sheet
      
      // Try to find a sheet that contains track data
      for (const sheet of metadata.sheets) {
        const sheetTitle = sheet.title.toLowerCase();
        
        // Skip template or metadata sheets
        if (sheetTitle.includes('template') || 
            sheetTitle.includes('metadata') || 
            sheetTitle.includes('info') ||
            sheetTitle === 'sheet1') {
          continue;
        }
        
        // Try to sample the sheet to see if it has track data structure
        try {
          const sampleData = await this.getSheetDataViaAPI(spreadsheetId, sheet.title);
          if (sampleData.length < 10) continue; // Skip sheets with too little data
          
          // Look for a sheet that has many rows and track-like structure
          // Check if it has era/name columns and many data rows
          const { headerIndex, columnMap } = this.findHeaderRow(sampleData);
          if (headerIndex >= 0 && columnMap['era'] !== undefined && columnMap['name'] !== undefined) {
            // Count actual track rows (not album metadata)
            let trackCount = 0;
            for (let i = headerIndex + 1; i < Math.min(sampleData.length, 100); i++) {
              const row = sampleData[i];
              const nameCol = row[columnMap['name'] || 1]?.toString().trim() || '';
              if (nameCol && !nameCol.includes('Tracklist') && !nameCol.includes('Official') && nameCol.length < 200) {
                trackCount++;
              }
            }
            
            console.log(`Sheet "${sheet.title}" has ${trackCount} track-like rows in first 100`);
            
            // If this sheet has a reasonable number of individual tracks, use it
            if (trackCount > 20) {
              targetSheet = sheet;
              console.log(`Selected sheet: ${sheet.title} (appears to have individual track data)`);
              break;
            }
          }
        } catch (error) {
          console.log(`Could not sample sheet ${sheet.title}:`, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }
      }
      
      console.log(`Using sheet: ${targetSheet.title} (sheetId: ${targetSheet.sheetId})`);
      
      // Get sheet data using the official API
      const rows = await this.getSheetDataViaAPI(spreadsheetId, targetSheet.title);
      console.log(`Retrieved ${rows.length} rows from sheet via API`);
      
      if (rows.length === 0) {
        throw new Error('No data found in the sheet');
      }

      // Find header row and column mapping
      const { headerIndex, columnMap } = this.findHeaderRow(rows);
      
      if (headerIndex === -1) {
        console.log('Header not found. First 10 rows for debugging:');
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          console.log(`Row ${i}:`, rows[i]);
        }
        throw new Error('Could not find header row in spreadsheet');
      }

      console.log(`Found header at row ${headerIndex}:`, rows[headerIndex]);
      console.log('Column mapping:', columnMap);

      // Parse sheet data
      const albums = this.parseSheetData(rows, columnMap, headerIndex + 1);
      
      // Extract artist name from document title
      const artistName = metadata.title.replace(/tracker/i, '').trim() || 'Unknown Artist';

      console.log(`Parsed ${albums.length} albums for artist: ${artistName}`);

      return {
        name: artistName,
        albums,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error parsing Google Sheets via official API:', error);
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
      const firstCell = rows[i]?.[0]?.toString().toLowerCase() || '';
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
      
      if (!row || row.every(cell => !cell?.toString().trim())) {
        continue; // Skip empty rows
      }

      const eraCol = row[columnMap['era'] || 0]?.toString().normalize('NFC').trim() || '';
      const nameCol = row[columnMap['name'] || 1]?.toString().normalize('NFC').trim() || '';

      console.log(`📋 Row ${i}: eraCol="${eraCol}", nameCol="${nameCol}"`);

      // Handle different types of rows based on content patterns
      if (eraCol && nameCol) {
        // Check if this is an album metadata row with statistics
        if (eraCol.match(/^\d+\s*og\s*file/i) ||
            eraCol.match(/\d+\s*(full|tagged|partial|snippet|stem|bounce|unavailable)/i) ||
            eraCol.includes('OG File(s)') ||
            eraCol.includes('Full\n') ||
            eraCol.includes('Tagged\n') ||
            eraCol.includes('Partial\n') ||
            eraCol.includes('Snippet(s)\n') ||
            eraCol.includes('Unavailable')) {
          
          // This is an album metadata row - nameCol contains the album name
          const albumName = nameCol;
          console.log(`📊 Found album metadata: "${albumName}" with stats: "${eraCol.substring(0, 50)}..."`);
          
          // Create new album if it doesn't exist
          if (!currentAlbum || currentAlbum.name !== albumName) {
            if (currentAlbum) {
              albums.push(currentAlbum);
              console.log(`✅ Completed album: ${currentAlbum.name} with ${currentAlbum.tracks.length} tracks`);
            }
            
            console.log(`🎵 Starting new album from metadata: ${albumName}`);
            currentAlbum = {
              id: `album-${albums.length}`,
              name: albumName,
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
              notes: row[columnMap['notes'] || 2]?.toString().normalize('NFC') || ''
            };
            
            // Update current era for subsequent tracks
            currentEraName = albumName;
          }
          continue; // Skip to next row
        }
        
        // Check if this is a sub-era description row (era name + description but no track)
        // Look for patterns like dates in parentheses, timeline info, or descriptive text
        const notesCol = row[columnMap['notes'] || 2]?.toString().normalize('NFC') || '';
        const isSubEraDescription = (
          // Has date patterns like (??/??/2007) or (10/10/2010)
          notesCol.match(/\(\d{1,2}\/\d{1,2}\/\d{4}\)/) ||
          notesCol.match(/\(\?\?\/\?\?\/\d{4}\)/) ||
          // Contains timeline or descriptive information
          notesCol.toLowerCase().includes('formed') ||
          notesCol.toLowerCase().includes('releases') ||
          notesCol.toLowerCase().includes('supergroup') ||
          notesCol.toLowerCase().includes('collaboration') ||
          // Long descriptive text (likely album/era description)
          notesCol.length > 100
        ) && (
          // Name column doesn't look like a track name
          !nameCol.match(/\w+\s+\w+/) || // Simple song titles
          nameCol.includes('(') && nameCol.includes(')') // Contains parenthetical info typical of descriptions
        );
        
        // Additional check for sub-era descriptions that shouldn't be albums
        const isSubEraName = (
          // Child Rebel Soldier should be treated as sub-era description, not album
          (eraCol.toLowerCase().includes('child') && eraCol.toLowerCase().includes('rebel')) ||
          // Other patterns that indicate descriptions rather than album names
          eraCol.match(/\(\d{2}\/\d{2}\/\d{4}\)/) || // Date patterns in era name
          eraCol.length > 50 // Very long era names are likely descriptions
        );
        
        if (isSubEraDescription || isSubEraName) {
          console.log(`📝 Found sub-era description: "${eraCol}" - "${nameCol}" (not creating new album)`);
          // This is descriptive content for the current era, don't change the current album
          continue;
        }
      }
      
      // Skip obvious non-data rows (Discord messages, etc.)
      if (eraCol && !nameCol) {
        // Check if this looks like a message/announcement rather than an era
        if (eraCol.toLowerCase().includes('discord') || 
            eraCol.toLowerCase().includes('tracker') ||
            eraCol.toLowerCase().includes('server') ||
            eraCol.toLowerCase().includes('join') ||
            eraCol.toLowerCase().includes('stay updated') ||
            eraCol.toLowerCase().includes('get new links') ||
            eraCol.includes('http')) {
          console.log(`⏭️  Skipping non-data row: "${eraCol}"`);
          continue;
        }
      }

      // Handle track rows
      if (nameCol) {
        // Determine the era for this track
        let trackEra = currentEraName;
        
        if (eraCol) {
          // This row has both era and name - check if eraCol is a valid era name
          // Valid era names should NOT be statistics, metadata, or sub-era descriptions
          const isValidEraName = (
            !eraCol.toLowerCase().includes('discord') && 
            !eraCol.toLowerCase().includes('tracker') &&
            !eraCol.toLowerCase().includes('server') &&
            !eraCol.toLowerCase().includes('join') &&
            !eraCol.toLowerCase().includes('stay updated') &&
            !eraCol.includes('http') &&
            !eraCol.match(/^\d+\s*og\s*file/i) &&
            !eraCol.match(/\d+\s*(full|tagged|partial|snippet|stem|bounce|unavailable)/i) &&
            !eraCol.includes('OG File(s)') &&
            !eraCol.includes('Full\n') &&
            !eraCol.includes('Tagged\n') &&
            !eraCol.includes('Partial\n') &&
            !eraCol.includes('Snippet(s)\n') &&
            !eraCol.includes('Unavailable')
          );
          
          // Also check if this looks like a track with an era rather than just a description
          const notesCol = row[columnMap['notes'] || 2]?.toString().normalize('NFC') || '';
          const trackLength = row[columnMap['trackLength'] || 3]?.toString().normalize('NFC') || '';
          const quality = row[columnMap['quality'] || 7]?.toString().normalize('NFC') || '';
          const links = row[columnMap['links'] || 8]?.toString().normalize('NFC') || '';
          
          // This looks like an actual track if it has typical track metadata
          const hasTrackMetadata = (
            trackLength.match(/\d+:\d+/) || // Has duration
            quality.toLowerCase().includes('quality') ||
            quality.toLowerCase().includes('og') ||
            quality.toLowerCase().includes('full') ||
            quality.toLowerCase().includes('snippet') ||
            links.includes('http') ||
            notesCol.toLowerCase().includes('track') ||
            notesCol.toLowerCase().includes('song') ||
            notesCol.toLowerCase().includes('leak') ||
            notesCol.toLowerCase().includes('sample')
          );
          
          if (isValidEraName && hasTrackMetadata) {
            // This appears to be a track with era info
            trackEra = eraCol;
            
            // Only update currentEraName if this is actually a new era
            if (trackEra !== currentEraName) {
              console.log(`🔄 Era change from "${currentEraName}" to "${trackEra}" (track: "${nameCol}")`);
              currentEraName = trackEra;
            }
          }
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
        const notes = row[columnMap['notes'] || 2]?.toString().normalize('NFC') || '';
        const trackLength = row[columnMap['trackLength'] || 3]?.toString().normalize('NFC') || '';
        const fileDate = row[columnMap['fileDate'] || 4]?.toString().normalize('NFC') || '';
        const leakDate = row[columnMap['leakDate'] || 5]?.toString().normalize('NFC') || '';
        const availableLength = row[columnMap['availableLength'] || 6]?.toString().normalize('NFC') || '';
        const quality = row[columnMap['quality'] || 7]?.toString().normalize('NFC') || '';
        const linksText = row[columnMap['links'] || 8]?.toString().normalize('NFC') || '';
        
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
        const rawNameLower = (track.rawName || '').toLowerCase();
        const titleLower = (track.title?.main || '').toLowerCase();
        
        // Quality classification logic (same as before)
        let metadataUpdated = false;
        
        if (qualityLower.includes('og file') || qualityLower.includes('og quality') || 
            qualityLower === 'og' || qualityLower.includes('original') ||
            rawNameLower.includes('og file') || rawNameLower.includes('(og)') ||
            titleLower.includes('og ') || titleLower.includes('(og)') || 
            titleLower.includes('og file')) {
          currentAlbum.metadata.ogFiles++;
          metadataUpdated = true;
        }
        else if (qualityLower.includes('snippet') || qualityLower === 'low quality' || 
                 qualityLower === 'recording' || qualityLower.includes('lq') ||
                 rawNameLower.includes('snippet') || titleLower.includes('snippet')) {
          currentAlbum.metadata.snippetFiles++;
          metadataUpdated = true;
        }
        else if (qualityLower.includes('partial') || rawNameLower.includes('partial') ||
                 titleLower.includes('partial') || qualityLower === 'partial') {
          currentAlbum.metadata.partialFiles++;
          metadataUpdated = true;
        }
        else if (qualityLower.includes('tagged') || rawNameLower.includes('tagged') ||
                 titleLower.includes('tagged') || qualityLower === 'tagged') {
          currentAlbum.metadata.taggedFiles++;
          metadataUpdated = true;
        }
        else if (qualityLower.includes('stem') || qualityLower.includes('bounce') ||
                 rawNameLower.includes('stem') || rawNameLower.includes('bounce') ||
                 titleLower.includes('stem') || titleLower.includes('bounce')) {
          currentAlbum.metadata.stemBounceFiles++;
          metadataUpdated = true;
        }
        else if (qualityLower.includes('not available') || qualityLower === 'not available' ||
                 qualityLower.includes('unavailable') || qualityLower === 'unavailable' ||
                 qualityLower.includes('n/a') || rawNameLower.includes('unavailable') || 
                 titleLower.includes('unavailable')) {
          currentAlbum.metadata.unavailableFiles++;
          metadataUpdated = true;
        }
        else if (qualityLower === 'high quality' || qualityLower === 'cd quality' ||
                 qualityLower.includes('full') || qualityLower.includes('lossless') ||
                 qualityLower.includes('320') || qualityLower.includes('flac') ||
                 qualityLower.includes('cdq') || qualityLower.includes('hq') ||
                 rawNameLower.includes('full') || titleLower.includes('full')) {
          currentAlbum.metadata.fullFiles++;
          metadataUpdated = true;
        }
        
        if (!metadataUpdated) {
          if (!quality || quality.trim() === '' || qualityLower === 'unknown') {
            currentAlbum.metadata.unavailableFiles++;
          } else {
            currentAlbum.metadata.fullFiles++;
          }
        }
        
        console.log(`➕ Added track: ${nameCol} (Quality: ${quality} → ${metadataUpdated ? 'categorized' : 'defaulted'}) (${currentAlbum.tracks.length} total tracks in ${currentAlbum.name})`);
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
