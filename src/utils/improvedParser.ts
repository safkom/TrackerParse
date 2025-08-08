import { GoogleSheetsAPIParser } from "@/utils/googleSheetsAPI";
import {
  Artist,
  Album,
  Track,
  TrackTitle,
  TrackLink,
  TrackerStatistics,
} from "@/types";

/**
 * Improved Google Sheets Parser
 * Uses the Google Sheets API instead of CSV for better data access and Unicode handling
 */
export class ImprovedParser {
  /**
   * Extract document ID from Google Sheets URL
   */
  static getDocumentId(googleSheetsUrl: string): string {
    const match = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("Invalid Google Sheets URL format");
    }
    return match[1];
  }

  /**
   * Extract spreadsheet ID and gid from Google Sheets URL
   */
  static getSpreadsheetInfo(googleSheetsUrl: string): {
    spreadsheetId: string;
    gid: string;
  } {
    const spreadsheetId = this.getDocumentId(googleSheetsUrl);

    // Extract gid from original URL if present
    const gidMatch = googleSheetsUrl.match(/[?&#]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : "0";

    return { spreadsheetId, gid };
  }

  /**
   * Get document title from Google Sheets using API
   */
  static async getDocumentTitle(googleSheetsUrl: string): Promise<string> {
    try {
      const spreadsheetId = this.getDocumentId(googleSheetsUrl);
      const metadata =
        await GoogleSheetsAPIParser.getSpreadsheetMetadata(spreadsheetId);

      let title = metadata.title.trim();
      // Remove Google Sheets indicators in multiple languages
      title = title.replace(
        /\s*-\s*Google\s*(Sheets?|Preglednice|Planilhas|Feuilles|Hojas|Tabele|Táblázatok|Spreadsheets|Arkusze|Folhas|Tabelki|Листы)\s*$/gi,
        "",
      );
      if (
        title &&
        title !== "Google Sheets" &&
        title !== "Google Preglednice" &&
        !title.includes("Sign in")
      ) {
        return title;
      }
    } catch (error) {
      console.warn(
        "⚠️ Could not fetch document title:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
    return "Unknown Tracker";
  }

  /**
   * Clean era name to extract just the main title without alternate names
   */
  static cleanEraName(rawEraName: string): {
    mainName: string;
    alternateNames: string[];
  } {
    if (!rawEraName || !rawEraName.trim()) {
      return { mainName: "Unknown Era", alternateNames: [] };
    }

    let cleanName = rawEraName.trim();
    const alternateNames: string[] = [];

    // Extract alternate names in parentheses
    const parenthesesPattern = /\s*\([^)]+\)/g;
    let match;
    while ((match = parenthesesPattern.exec(cleanName)) !== null) {
      const altName = match[0].replace(/^\s*\(|\)$/g, "").trim();
      if (altName) {
        alternateNames.push(altName);
      }
    }

    // Remove all parentheses content to get main name
    cleanName = cleanName.replace(parenthesesPattern, "").trim();

    // Extract alternate names in square brackets
    const bracketsPattern = /\s*\[[^\]]+\]/g;
    let bracketMatch;
    while ((bracketMatch = bracketsPattern.exec(cleanName)) !== null) {
      const altName = bracketMatch[0].replace(/^\s*\[|\]$/g, "").trim();
      if (altName) {
        alternateNames.push(altName);
      }
    }

    // Remove all brackets content to get main name
    cleanName = cleanName.replace(bracketsPattern, "").trim();

    // Ensure we have a valid main name
    if (!cleanName) {
      cleanName = rawEraName.split(/[\(\[\)\]]/)[0].trim() || "Unknown Era";
    }

    return { mainName: cleanName, alternateNames };
  }

  /**
   * Parse track title to extract features and metadata
   */
  static parseTrackTitle(rawTitle: string): TrackTitle {
    if (!rawTitle) {
      return {
        main: "",
        isUnknown: false,
        features: [],
        collaborators: [],
        producers: [],
        references: [],
        alternateNames: [],
      };
    }

    // Enhanced Unicode handling to fix broken emoji sequences
    let cleanTitle = rawTitle
      .normalize("NFC") // Normalize Unicode to composed form
      .trim();

    // Fix common broken Unicode patterns
    cleanTitle = cleanTitle
      // Fix broken emoji sequences (like �️🤖)
      .replace(/�+/g, "") // Remove replacement characters
      .replace(/\uFFFD+/g, "") // Remove Unicode replacement characters
      // Fix specific broken patterns that commonly occur
      .replace(/�️/g, "") // Remove broken variation selector
      .replace(/\u{FE0F}/gu, "") // Remove variation selector-16
      .replace(/\u{200D}/gu, "") // Remove zero-width joiner
      // Clean up multiple spaces that might result from character removal
      .replace(/\s+/g, " ")
      .trim();

    const features: string[] = [];
    const producers: string[] = [];
    const alternateNames: string[] = [];

    // Check if title contains unknown markers
    const isUnknown = cleanTitle.includes("???");

    // Extract features (ft., feat., featuring, with, &) - expanded patterns
    const featurePattern =
      /\s*(?:\(|\[)?\s*(?:ft\.?|feat\.?|featuring|with|&)\s+([^)\]]+?)(?:\)|\])?$/gi;
    let match = featurePattern.exec(cleanTitle);
    if (match) {
      const featList = match[1].split(/[,&+]/);
      features.push(...featList.map((f) => f.trim()).filter((f) => f));
      cleanTitle = cleanTitle.replace(match[0], "").trim();
    }

    // Extract producers (prod., produced by, beat by) - expanded patterns
    const producerPattern =
      /\s*(?:\(|\[)?\s*(?:prod\.?|produced by|beat by|instrumental by)\s+([^)\]]+?)(?:\)|\])?$/gi;
    match = producerPattern.exec(cleanTitle);
    if (match) {
      const prodList = match[1].split(/[,&+]/);
      producers.push(...prodList.map((p) => p.trim()).filter((p) => p));
      cleanTitle = cleanTitle.replace(match[0], "").trim();
    }

    // Extract alternate names in parentheses or brackets
    const altNamePattern = /\s*(?:\(([^)]+)\)|\[([^\]]+)\])/g;
    let altMatch;
    while ((altMatch = altNamePattern.exec(cleanTitle)) !== null) {
      const altName = (altMatch[1] || altMatch[2]).trim();
      if (altName && !altName.match(/^\d+$/)) {
        alternateNames.push(altName);
      }
      cleanTitle = cleanTitle.replace(altMatch[0], "").trim();
    }

    // Clean main title and preserve valid Unicode characters while removing broken ones
    const main = cleanTitle
      // Remove common music-related emojis that might appear broken
      .replace(/[🎵🎶🎤🎧🔥💎⭐✨🏆🤖]/g, "")
      // Remove any remaining replacement characters
      .replace(/�/g, "")
      .replace(/\uFFFD/g, "")
      // Clean up extra whitespace
      .replace(/\s+/g, " ")
      .trim()
      // Final Unicode normalization
      .normalize("NFC");

    return {
      main,
      isUnknown,
      features,
      collaborators: [], // Not commonly used, keeping for compatibility
      producers,
      references: [], // Not commonly used, keeping for compatibility
      alternateNames,
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
   * Categorize links by platform - expanded for more platforms
   */
  static categorizeLink(url: string): {
    platform: string;
    type: string;
    isValid: boolean;
  } {
    if (!url?.trim()) {
      return { platform: "unknown", type: "unknown", isValid: false };
    }

    const cleanUrl = url.trim();
    const isValid = /^https?:\/\/.+/.test(cleanUrl);

    let platform = "unknown";
    let type = "unknown";

    if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
      platform = "youtube";
      type = "video";
    } else if (cleanUrl.includes("soundcloud.com")) {
      platform = "soundcloud";
      type = "audio";
    } else if (cleanUrl.includes("spotify.com")) {
      platform = "spotify";
      type = "stream";
    } else if (
      cleanUrl.includes("apple.com/music") ||
      cleanUrl.includes("music.apple.com")
    ) {
      platform = "apple-music";
      type = "stream";
    } else if (
      cleanUrl.includes("pillows.su") ||
      cleanUrl.includes("pillowcase.su")
    ) {
      platform = "pillowcase";
      type = "audio";
    } else if (cleanUrl.includes("dbree.") || cleanUrl.includes("dbr.ee")) {
      platform = "dbree";
      type = "audio";
    } else if (cleanUrl.includes("mediafire.com")) {
      platform = "mediafire";
      type = "download";
    } else if (
      cleanUrl.includes("mega.nz") ||
      cleanUrl.includes("mega.co.nz")
    ) {
      platform = "mega";
      type = "download";
    } else if (cleanUrl.includes("dropbox.com")) {
      platform = "dropbox";
      type = "download";
    } else if (cleanUrl.includes("drive.google.com")) {
      platform = "google-drive";
      type = "download";
    } else if (cleanUrl.includes("tidal.com")) {
      platform = "tidal";
      type = "stream";
    } else if (cleanUrl.includes("deezer.com")) {
      platform = "deezer";
      type = "stream";
    } else if (cleanUrl.includes("bandcamp.com")) {
      platform = "bandcamp";
      type = "stream";
    } else if (cleanUrl.includes("instagram.com")) {
      platform = "instagram";
      type = "social";
    } else if (cleanUrl.includes("twitter.com") || cleanUrl.includes("x.com")) {
      platform = "twitter";
      type = "social";
    } else if (cleanUrl.includes("facebook.com")) {
      platform = "facebook";
      type = "social";
    } else if (
      cleanUrl.includes("discord.gg") ||
      cleanUrl.includes("discord.com")
    ) {
      platform = "discord";
      type = "social";
    }

    return { platform, type, isValid };
  }

  /**
   * Find header row and create column mapping
   */
  static findHeaderRow(rows: string[][]): {
    headerIndex: number;
    columnMap: Record<string, number>;
  } {
    const columnMap: Record<string, number> = {};
    let headerIndex = -1;

    // Look for a row containing common column names
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      const lowerRow = row.map((cell) => cell?.toLowerCase().trim() || "");

      let matchCount = 0;
      const tempMap: Record<string, number> = {};

      lowerRow.forEach((cell, index) => {
        console.log(`Checking cell ${index}: "${cell}"`);
        // Era/Album column detection
        if (cell.includes("era") || cell.includes("album")) {
          tempMap["era"] = index;
          matchCount++;
          console.log(`  -> Matched 'era' at index ${index}`);
        }
        // Track name column detection - be more permissive
        else if (
          cell === "name" ||
          cell.startsWith("name") ||
          cell.includes("song title") ||
          cell.includes("track title") ||
          cell.includes("title")
        ) {
          tempMap["name"] = index;
          matchCount++;
          console.log(`  -> Matched 'name' at index ${index}`);
        }
        // Notes column detection
        else if (cell.includes("notes") || cell.includes("note")) {
          tempMap["notes"] = index;
          matchCount++;
          console.log(`  -> Matched 'notes' at index ${index}`);
        }
        // Track length/duration column detection
        else if (
          (cell.includes("track") && cell.includes("length")) ||
          cell.includes("duration")
        ) {
          tempMap["trackLength"] = index;
          matchCount++;
          console.log(`  -> Matched 'trackLength' at index ${index}`);
        }
        // Leak date column detection
        else if (cell.includes("leak") && cell.includes("date")) {
          tempMap["leakDate"] = index;
          matchCount++;
          console.log(`  -> Matched 'leakDate' at index ${index}`);
        }
        // File date column detection
        else if (cell.includes("file") && cell.includes("date")) {
          tempMap["fileDate"] = index;
          matchCount++;
          console.log(`  -> Matched 'fileDate' at index ${index}`);
        }
        // Available length column detection
        else if (cell.includes("available") && cell.includes("length")) {
          tempMap["availableLength"] = index;
          matchCount++;
          console.log(`  -> Matched 'availableLength' at index ${index}`);
        }
        // Quality column detection
        else if (cell.includes("quality")) {
          tempMap["quality"] = index;
          matchCount++;
          console.log(`  -> Matched 'quality' at index ${index}`);
        }
        // Links column detection
        else if (cell.includes("link") || cell.includes("url")) {
          tempMap["links"] = index;
          matchCount++;
          console.log(`  -> Matched 'links' at index ${index}`);
        }
      });

      // If we found enough column matches, this is likely the header
      if (matchCount >= 3) {
        // Back to original threshold
        headerIndex = i;
        Object.assign(columnMap, tempMap);
        break;
      }
    }

    return { headerIndex, columnMap };
  }

  /**
   * Parse CSV data into structured format - now uses Google Sheets API data
   */
  static async parseCSVData(csvData: string): Promise<string[][]> {
    // This method is kept for compatibility but now just returns the data as-is
    // since we're getting structured data directly from the Google Sheets API
    throw new Error(
      "This method is deprecated - use Google Sheets API directly",
    );
  }

  /**
   * Fetch data with retry mechanism - deprecated, now using Google Sheets API
   */
  private static async fetchWithRetry(url: string, retries = 3): Promise<any> {
    throw new Error(
      "This method is deprecated - use Google Sheets API directly",
    );
  }

  /**
   * Main parsing method - uses ONLY Google Sheets API (no CSV fallbacks)
   */
  static async parseGoogleDoc(googleSheetsUrl: string): Promise<Artist> {
    try {
      console.log(
        `🔍 Parsing Google Sheets using OFFICIAL API ONLY: ${googleSheetsUrl}`,
      );

      // Get spreadsheet ID and gid
      const { spreadsheetId, gid } = this.getSpreadsheetInfo(googleSheetsUrl);
      console.log(`📊 Spreadsheet ID: ${spreadsheetId}, GID: ${gid}`);

      // Use Google Sheets API - no fallbacks
      const availableSheets =
        await GoogleSheetsAPIParser.getAvailableSheets(spreadsheetId);
      console.log(`🔍 Available sheets:`, availableSheets);

      // If we have a specific GID from URL, try to find that sheet
      // Otherwise, use the first sheet (or default to Sheet1)
      let targetSheet = availableSheets.find((sheet) => sheet.gid === gid);
      if (!targetSheet && availableSheets.length > 0) {
        targetSheet = availableSheets[0]; // Use first available sheet
      }

      const sheetName = targetSheet ? targetSheet.title : "Sheet1";
      const actualGid = targetSheet ? targetSheet.gid : gid;

      console.log(`📋 Using sheet: ${sheetName} (GID: ${actualGid})`);

      const rows = await GoogleSheetsAPIParser.getSheetDataViaAPI(
        spreadsheetId,
        sheetName,
      );
      console.log(`📋 Fetched ${rows.length} rows from Google Sheets API`);

      // Normalize Unicode for consistent processing
      const normalizedRows = rows
        .map((row) =>
          row.map((cell) => (cell || "").toString().normalize("NFC")),
        )
        .filter((row) => row.some((cell) => cell.trim())); // Remove empty rows

      if (normalizedRows.length === 0) {
        throw new Error("No data found in spreadsheet");
      }

      // Find header row and column mapping
      const { headerIndex, columnMap } = this.findHeaderRow(normalizedRows);

      console.log(
        `🔍 Header search results: headerIndex=${headerIndex}, columnMap=`,
        columnMap,
      );

      if (headerIndex === -1) {
        console.log("⚠️ Header not found. First 10 rows for debugging:");
        for (let i = 0; i < Math.min(10, normalizedRows.length); i++) {
          console.log(`Row ${i}:`, normalizedRows[i]);
        }

        // If no formal header found, use flexible parsing for all rows (temporarily disabled)
        console.log(
          "⚠️ No formal headers found - using basic fallback parsing...",
        );
        // return this.parseWithoutHeaders(normalizedRows, googleSheetsUrl);
        throw new Error(
          "No formal headers found in spreadsheet. Please ensure the spreadsheet has proper column headers.",
        );
      }

      console.log(
        `✅ Found header at row ${headerIndex}:`,
        normalizedRows[headerIndex],
      );

      // Parse sheet data
      const albums = this.parseSheetData(
        normalizedRows,
        columnMap,
        headerIndex + 1,
      );

      // Get document title and extract artist name
      const documentTitle = await this.getDocumentTitle(googleSheetsUrl);
      const artistName =
        documentTitle.replace(/tracker/i, "").trim() || "Unknown Artist";

      console.log(
        `🎯 Successfully parsed ${albums.length} albums for artist: ${artistName}`,
      );

      return {
        name: artistName,
        albums,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("💥 Error parsing Google Sheets:", error);

      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          throw new Error(
            "Google Sheets API key is not configured. Please set GOOGLE_SHEETS_API_KEY in your .env.local file.",
          );
        } else if (error.message.includes("quota")) {
          throw new Error(
            "Google Sheets API quota exceeded. Please try again later.",
          );
        }
      }

      throw new Error(
        `Failed to parse Google Sheet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Parse spreadsheet data when no formal headers are found using flexible row parsing
   * TODO: Temporarily disabled due to parseRowFlexibly syntax error
   */
  /*
  private static async parseWithoutHeaders(rows: string[][], googleSheetsUrl: string): Promise<Artist> {
    console.log('🔄 Using flexible parsing without formal headers...');
    
    const tracks: Track[] = [];
    let currentEra = 'Unknown Era';
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => !cell?.trim())) continue;
      
      // Skip obvious non-data rows
      const firstCell = row[0]?.toLowerCase() || '';
      if (firstCell.includes('discord') || firstCell.includes('server') || 
          firstCell.includes('join') || firstCell.includes('stay updated')) {
        continue;
      }
      
      // Use flexible parsing for each row (temporarily disabled)
      // const parsedRow = this.parseRowFlexibly(row);
      const parsedRow = { era: null, trackName: null };
      
      // Update era if found
      if (parsedRow.era) {
        currentEra = parsedRow.era;
      }
      
      // Create track if we have a track name
      if (parsedRow.trackName) {
        const track: Track = {
          id: `${currentEra}-${parsedRow.trackName}-${tracks.length}`,
          era: currentEra,
          title: this.parseTrackTitle(parsedRow.trackName),
          rawName: parsedRow.trackName,
          notes: Array.isArray(parsedRow.notes) ? parsedRow.notes.join(', ') : (parsedRow.notes || ''),
          trackLength: parsedRow.trackLength || '',
          fileDate: parsedRow.fileDate || '',
          leakDate: parsedRow.leakDate || '',
          availableLength: parsedRow.availableLength || '',
          quality: parsedRow.quality || '',
          links: parsedRow.links.map((url: string) => {
            const linkInfo = this.categorizeLink(url);
            return {
              url,
              type: linkInfo.type as any,
              platform: linkInfo.platform,
              isValid: linkInfo.isValid
            };
          }),
          isSpecial: parsedRow.trackName.includes('⭐') || parsedRow.trackName.includes('✨') || parsedRow.trackName.includes('🏆'),
          specialType: parsedRow.trackName.includes('⭐') ? '⭐' : 
                      parsedRow.trackName.includes('✨') ? '✨' : 
                      parsedRow.trackName.includes('🏆') ? '🏆' : undefined,
          isWanted: parsedRow.trackName.includes('🥇') || parsedRow.trackName.includes('🥈') || parsedRow.trackName.includes('🥉'),
          wantedType: parsedRow.trackName.includes('🥇') ? '🥇' : 
                     parsedRow.trackName.includes('🥈') ? '🥈' : 
                     parsedRow.trackName.includes('🥉') ? '🥉' : undefined
        };
        
        tracks.push(track);
        console.log(`🎵 Flexible parsed track: ${parsedRow.trackName} (Era: ${currentEra})`);
      }
    }
    
    // Group tracks by era into albums
    const albumMap = new Map<string, Track[]>();
    tracks.forEach(track => {
      if (!albumMap.has(track.era)) {
        albumMap.set(track.era, []);
      }
      albumMap.get(track.era)!.push(track);
    });
    
    const albums = Array.from(albumMap.entries()).map(([eraName, eraTracks], index) => ({
      id: `album-${index}`,
      name: eraName,
      picture: '',
      description: '',
      tracks: eraTracks,
      metadata: {
        ogFiles: eraTracks.filter(t => t.quality?.toLowerCase().includes('og')).length,
        fullFiles: eraTracks.filter(t => t.quality?.toLowerCase().includes('full')).length,
        taggedFiles: eraTracks.filter(t => t.quality?.toLowerCase().includes('tagged')).length,
        partialFiles: eraTracks.filter(t => t.quality?.toLowerCase().includes('partial')).length,
        snippetFiles: eraTracks.filter(t => t.quality?.toLowerCase().includes('snippet')).length,
        stemBounceFiles: eraTracks.filter(t => t.quality?.toLowerCase().includes('stem') || t.quality?.toLowerCase().includes('bounce')).length,
        unavailableFiles: eraTracks.filter(t => !t.quality || t.quality?.toLowerCase().includes('unavailable')).length
      },
      notes: ''
    }));
    
    const documentTitle = await this.getDocumentTitle(googleSheetsUrl);
    const artistName = documentTitle.replace(/tracker/i, '').trim() || 'Unknown Artist';
    
    console.log(`🎯 Flexible parsing completed: ${albums.length} albums, ${tracks.length} total tracks for artist: ${artistName}`);
    
    return {
      name: artistName,
      albums,
      lastUpdated: new Date().toISOString()
    };
  }
  */

  /**
   * Parse sheet data into albums and tracks
   */
  private static parseSheetData(
    rows: string[][],
    columnMap: Record<string, number>,
    startRow: number,
  ): Album[] {
    console.log(
      `🔄 parseSheetData: Processing ${rows.length} rows starting from row ${startRow}`,
    );
    console.log("🗂️ Column mapping:", columnMap);

    const albums: Album[] = [];
    let currentAlbum: Album | null = null;
    let currentEraName = "";
    let currentEraAlternates: string[] = [];

    // Find where data ends (statistics section, updates, etc.)
    let dataEndRow = rows.length;
    for (let i = startRow; i < rows.length; i++) {
      const firstCell = rows[i]?.[0]?.toLowerCase() || "";
      // Look for section endings - be more conservative than before
      if (
        firstCell.includes("total tracks") ||
        firstCell.includes("total files") ||
        firstCell.includes("statistic") ||
        firstCell.includes("last updated") ||
        firstCell.includes("updates") ||
        firstCell.includes("changelog") ||
        firstCell.includes("credits") ||
        firstCell.includes("contact") ||
        firstCell.match(/^\d+\s+(total|files|tracks|links)/) ||
        // Generic patterns for end of data - but be more specific
        firstCell.includes("---") ||
        firstCell.includes("===") ||
        firstCell.startsWith("end") ||
        firstCell.startsWith("footer")
      ) {
        dataEndRow = i;
        console.log(`📊 Found end of data section at row ${i}: "${firstCell}"`);
        break;
      }
    }

    console.log(
      `📊 Data processing range: rows ${startRow} to ${dataEndRow} (${dataEndRow - startRow} rows)`,
    );

    // Process data rows
    for (let i = startRow; i < dataEndRow; i++) {
      const row = rows[i];

      if (!row || row.every((cell) => !cell?.trim())) {
        continue; // Skip empty rows
      }

      const eraCol = row[columnMap["era"] || 0]?.trim() || "";
      const nameCol = row[columnMap["name"] || 1]?.trim() || "";

      console.log(`📋 Row ${i}: eraCol="${eraCol}", nameCol="${nameCol}"`);

      // Skip obvious non-data rows (Discord messages, statistics, etc.)
      if (eraCol && !nameCol) {
        // Check if this looks like a message/announcement rather than an era
        if (
          eraCol.toLowerCase().includes("discord") ||
          eraCol.toLowerCase().includes("tracker") ||
          eraCol.toLowerCase().includes("server") ||
          eraCol.toLowerCase().includes("join") ||
          eraCol.toLowerCase().includes("stay updated") ||
          eraCol.toLowerCase().includes("get new links") ||
          eraCol.includes("http")
        ) {
          console.log(`⏭️  Skipping non-data row: "${eraCol}"`);
          continue;
        }
      }

      // Handle special case: statistics in Era column with actual album name in Name column
      if (eraCol && nameCol) {
        // Check if Era column contains statistics info (multiline with numbers and file types)
        const statsPattern =
          /^\d+\s*(og\s*file|full|tagged|partial|snippet|stem|bounce|unavailable)/i;
        const multilineStatsPattern =
          /\n.*\d+\s*(full|tagged|partial|snippet|stem|bounce|unavailable)/i;

        if (statsPattern.test(eraCol) || multilineStatsPattern.test(eraCol)) {
          // This row contains statistics - the Name column contains the album name
          const rawAlbumName = nameCol.trim();
          if (
            rawAlbumName &&
            !rawAlbumName.match(/^\d/) &&
            !rawAlbumName.toLowerCase().includes("discord")
          ) {
            // Clean the album name using the same logic as era names
            const { mainName: cleanAlbumName, alternateNames } =
              ImprovedParser.cleanEraName(rawAlbumName);
            console.log(
              `📊 Found statistics row - starting new album: "${rawAlbumName}" → "${cleanAlbumName}" (alternates: ${alternateNames.join(", ")})`,
            );

            // Finish current album if it exists
            if (currentAlbum) {
              albums.push(currentAlbum);
              console.log(
                `✅ Completed album: ${currentAlbum.name} with ${currentAlbum.tracks.length} tracks`,
              );
            }

            // Start new album
            currentAlbum = {
              id: `album-${albums.length}`,
              name: cleanAlbumName,
              alternateNames:
                alternateNames.length > 0 ? alternateNames : undefined,
              picture: "",
              description: "",
              tracks: [],
              metadata: {
                ogFiles: 0,
                fullFiles: 0,
                taggedFiles: 0,
                partialFiles: 0,
                snippetFiles: 0,
                stemBounceFiles: 0,
                unavailableFiles: 0,
              },
              notes: "",
            };

            // Parse statistics from the Era column and update metadata
            const stats = eraCol.toLowerCase();
            const ogMatch = stats.match(/(\d+)\s*og\s*file/);
            const fullMatch = stats.match(/(\d+)\s*full/);
            const taggedMatch = stats.match(/(\d+)\s*tagged/);
            const partialMatch = stats.match(/(\d+)\s*partial/);
            const snippetMatch = stats.match(/(\d+)\s*snippet/);
            const stemMatch = stats.match(/(\d+)\s*stem/);
            const unavailableMatch = stats.match(/(\d+)\s*unavailable/);

            if (currentAlbum.metadata) {
              if (ogMatch) currentAlbum.metadata.ogFiles = parseInt(ogMatch[1]);
              if (fullMatch)
                currentAlbum.metadata.fullFiles = parseInt(fullMatch[1]);
              if (taggedMatch)
                currentAlbum.metadata.taggedFiles = parseInt(taggedMatch[1]);
              if (partialMatch)
                currentAlbum.metadata.partialFiles = parseInt(partialMatch[1]);
              if (snippetMatch)
                currentAlbum.metadata.snippetFiles = parseInt(snippetMatch[1]);
              if (stemMatch)
                currentAlbum.metadata.stemBounceFiles = parseInt(stemMatch[1]);
              if (unavailableMatch)
                currentAlbum.metadata.unavailableFiles = parseInt(
                  unavailableMatch[1],
                );
            }

            continue; // Skip this row as it's just metadata
          }
        }
      }

      // Handle track rows
      if (nameCol) {
        // Update current era if this row has an era specified
        if (
          eraCol &&
          !eraCol.toLowerCase().includes("discord") &&
          !eraCol.toLowerCase().includes("tracker") &&
          !eraCol.toLowerCase().includes("server") &&
          !eraCol.toLowerCase().includes("join") &&
          !eraCol.toLowerCase().includes("stay updated") &&
          !eraCol.includes("http") &&
          !eraCol.match(/^\d+\s*og\s*file/i) &&
          !eraCol.match(
            /\d+\s*(full|tagged|partial|snippet|stem|bounce|unavailable)/i,
          )
        ) {
          const { mainName, alternateNames } =
            ImprovedParser.cleanEraName(eraCol);
          currentEraName = mainName;
          currentEraAlternates = alternateNames;
          console.log(
            `🎯 Updated era: "${eraCol}" → "${currentEraName}" (alternates: ${alternateNames.join(", ")})`,
          );
        }

        // If we don't have a current album, we might be in a situation where tracks are listed
        // before any statistics row. In this case, create a default album using the era name.
        if (!currentAlbum) {
          if (!currentEraName) {
            console.log(
              `⏭️  Skipping track without era or album: "${nameCol}"`,
            );
            continue;
          }

          console.log(`🎵 Creating default album for era: ${currentEraName}`);

          currentAlbum = {
            id: `album-${albums.length}`,
            name: currentEraName,
            alternateNames:
              currentEraAlternates.length > 0
                ? currentEraAlternates
                : undefined,
            picture: "",
            description: "",
            tracks: [],
            metadata: {
              ogFiles: 0,
              fullFiles: 0,
              taggedFiles: 0,
              partialFiles: 0,
              snippetFiles: 0,
              stemBounceFiles: 0,
              unavailableFiles: 0,
            },
            notes: "",
          };
        }

        console.log(
          `🎵 Processing track row: ${nameCol} for album: ${currentAlbum.name}`,
        );

        const parsedTitle = this.parseTrackTitle(nameCol);
        const notes = row[columnMap["notes"] || 2] || "";
        const trackLength = row[columnMap["trackLength"] || 3] || "";
        const fileDate = row[columnMap["fileDate"] || 4] || "";
        const leakDate = row[columnMap["leakDate"] || 5] || "";
        const availableLength = row[columnMap["availableLength"] || 6] || "";
        const quality = row[columnMap["quality"] || 7] || "";
        const linksText = row[columnMap["links"] || 8] || "";

        // Create a unique identifier for this track (same tracks have same era+name+notes+quality+availability)
        const trackIdentifier = `${currentEraName || currentAlbum.name}-${nameCol}-${notes}-${availableLength}-${quality}`;

        // Process links for this row
        const rowLinks: TrackLink[] = [];
        if (linksText) {
          const linkUrls = linksText
            .split(/[,\n]/)
            .map((l) => l.trim())
            .filter((l) => l);
          for (const url of linkUrls) {
            const linkInfo = this.categorizeLink(url);
            rowLinks.push({
              url,
              type: linkInfo.type as TrackLink["type"],
              platform: linkInfo.platform,
              isValid: linkInfo.isValid,
            });
          }
        }

        // Check if this track already exists in the current album
        let existingTrack = currentAlbum.tracks.find((track) => {
          const existingIdentifier = `${track.era}-${track.rawName}-${track.notes}-${track.availableLength}-${track.quality}`;
          return existingIdentifier === trackIdentifier;
        });

        if (existingTrack) {
          // Merge links into existing track
          console.log(`🔗 Merging links into existing track: ${nameCol}`);
          existingTrack.links.push(...rowLinks);
        } else {
          // Create new track
          console.log(`✨ Creating new track: ${nameCol}`);
          const newTrack: Track = {
            id: `${currentAlbum.name}-${nameCol}-${currentAlbum.tracks.length}`,
            era: currentEraName || currentAlbum.name,
            title: parsedTitle,
            rawName: nameCol,
            notes,
            trackLength,
            fileDate:
              this.parseTrackDate(fileDate)?.toISOString().split("T")[0] ||
              fileDate,
            leakDate:
              this.parseTrackDate(leakDate)?.toISOString().split("T")[0] ||
              leakDate,
            availableLength,
            quality,
            links: rowLinks,
            isSpecial:
              nameCol.includes("⭐") ||
              nameCol.includes("✨") ||
              nameCol.includes("🏆"),
            specialType: nameCol.includes("⭐")
              ? "⭐"
              : nameCol.includes("✨")
                ? "✨"
                : nameCol.includes("🏆")
                  ? "🏆"
                  : undefined,
            isWanted:
              nameCol.includes("🥇") ||
              nameCol.includes("🥈") ||
              nameCol.includes("🥉"),
            wantedType: nameCol.includes("🥇")
              ? "🥇"
              : nameCol.includes("🥈")
                ? "🥈"
                : nameCol.includes("🥉")
                  ? "🥉"
                  : undefined,
          };

          currentAlbum.tracks.push(newTrack);
          existingTrack = newTrack; // Reference for metadata update below
        }
        // Update metadata based on quality (enhanced matching for spreadsheet-specific patterns)
        // Only update metadata for newly created tracks to avoid double-counting
        if (existingTrack && existingTrack.links.length === rowLinks.length) {
          const qualityLower = quality.toLowerCase();
          const rawNameLower = (existingTrack.rawName || "").toLowerCase();
          const titleLower = (existingTrack.title?.main || "").toLowerCase();

          // More precise matching logic - check quality field first, then fallback to names
          let metadataUpdated = false;

          // Check for OG files first (highest priority) - improved patterns
          if (
            qualityLower.includes("og file") ||
            qualityLower.includes("og quality") ||
            qualityLower === "og" ||
            qualityLower.includes("original") ||
            rawNameLower.includes("og file") ||
            rawNameLower.includes("(og)") ||
            titleLower.includes("og ") ||
            titleLower.includes("(og)") ||
            titleLower.includes("og file")
          ) {
            currentAlbum.metadata.ogFiles++;
            metadataUpdated = true;
          }
          // Check for snippets - updated for actual data patterns
          else if (
            qualityLower.includes("snippet") ||
            qualityLower === "low quality" ||
            qualityLower === "recording" ||
            qualityLower.includes("lq") ||
            rawNameLower.includes("snippet") ||
            titleLower.includes("snippet")
          ) {
            currentAlbum.metadata.snippetFiles++;
            metadataUpdated = true;
          }
          // Check for partial files
          else if (
            qualityLower.includes("partial") ||
            rawNameLower.includes("partial") ||
            titleLower.includes("partial") ||
            qualityLower === "partial"
          ) {
            currentAlbum.metadata.partialFiles++;
            metadataUpdated = true;
          }
          // Check for tagged files
          else if (
            qualityLower.includes("tagged") ||
            rawNameLower.includes("tagged") ||
            titleLower.includes("tagged") ||
            qualityLower === "tagged"
          ) {
            currentAlbum.metadata.taggedFiles++;
            metadataUpdated = true;
          }
          // Check for stem bounces
          else if (
            qualityLower.includes("stem") ||
            qualityLower.includes("bounce") ||
            rawNameLower.includes("stem") ||
            rawNameLower.includes("bounce") ||
            titleLower.includes("stem") ||
            titleLower.includes("bounce")
          ) {
            currentAlbum.metadata.stemBounceFiles++;
            metadataUpdated = true;
          }
          // Check for unavailable files - updated for actual data patterns
          else if (
            qualityLower.includes("not available") ||
            qualityLower === "not available" ||
            qualityLower.includes("unavailable") ||
            qualityLower === "unavailable" ||
            qualityLower.includes("n/a") ||
            rawNameLower.includes("unavailable") ||
            titleLower.includes("unavailable")
          ) {
            currentAlbum.metadata.unavailableFiles++;
            metadataUpdated = true;
          }
          // Check for full/high quality files - updated for actual data patterns
          else if (
            qualityLower === "high quality" ||
            qualityLower === "cd quality" ||
            qualityLower.includes("full") ||
            qualityLower.includes("lossless") ||
            qualityLower.includes("320") ||
            qualityLower.includes("flac") ||
            qualityLower.includes("cdq") ||
            qualityLower.includes("hq") ||
            rawNameLower.includes("full") ||
            titleLower.includes("full")
          ) {
            currentAlbum.metadata.fullFiles++;
            metadataUpdated = true;
          }

          // If no specific category matched, try to infer from context or default
          if (!metadataUpdated) {
            // Default based on common quality patterns or empty quality
            if (
              !quality ||
              quality.trim() === "" ||
              qualityLower === "unknown"
            ) {
              // Default to unavailable for unclear cases
              currentAlbum.metadata.unavailableFiles++;
            } else {
              // Has some quality info but didn't match patterns - likely full
              currentAlbum.metadata.fullFiles++;
            }
          }

          console.log(
            `➕ Added track: ${nameCol} (Quality: ${quality} → ${metadataUpdated ? "categorized" : "defaulted"}) (${currentAlbum.tracks.length} total tracks in ${currentAlbum.name})`,
          );
        }
      }
    }

    // Add the last album
    if (currentAlbum) {
      albums.push(currentAlbum);
      console.log(
        `✅ Completed final album: ${currentAlbum.name} with ${currentAlbum.tracks.length} tracks`,
      );
    }

    console.log(`🎯 Total albums parsed: ${albums.length}`);
    albums.forEach((album, i) => {
      console.log(
        `  Album ${i + 1}: ${album.name} (${album.tracks.length} tracks)`,
      );
    });

    return albums.filter((album) => album.tracks.length > 0);
  }
}
