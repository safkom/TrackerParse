import axios from 'axios';
import { Artist, Album, Track, TrackTitle, TrackerStatistics, EraMetadata } from '@/types';

// Google Sheets API response interfaces
interface GoogleSheetsColumn {
  id: string;
  label: string;
  type: string;
}

interface GoogleSheetsCell {
  v: string | number | boolean | null;
  f?: string;
}

interface GoogleSheetsRow {
  c: (GoogleSheetsCell | null)[];
}

interface GoogleSheetsTable {
  cols: GoogleSheetsColumn[];
  rows: GoogleSheetsRow[];
  parsedNumHeaders?: number;
}

interface GoogleSheetsResponse {
  version?: string;
  reqId?: string;
  status?: string;
  sig?: string;
  table?: GoogleSheetsTable;
}

interface ParsedJsonData {
  metadata: {
    artistName?: string;
    [key: string]: unknown;
  };
  columnMap: Record<string, number>;
  headers: string[];
  eras: {
    name: string;
    trackCount: number;
    firstTrackIndex: number;
    tracks?: Track[];
    picture?: string;
    description?: string;
    notes?: string;
    [key: string]: unknown;
  }[];
  tracks: {
    name: string;
    era: string;
    [key: string]: unknown;
  }[];
  statistics: Record<string, unknown>;
  totalRows: number;
  dataRows: number;
}

export class GoogleDocsParser {
  // Convert Google Docs URL to JSON API URL
  static getJsonUrl(googleDocsUrl: string, gid?: string): string {
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
    
    // Return Google Sheets JSON API URL with optional gid for specific sheet
    if (gid) {
      return `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:json&gid=${gid}`;
    }
    return `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:json`;
  }

  // Parse Google Sheets JSON response
  static parseGoogleSheetsJson(jsonText: string): GoogleSheetsResponse | GoogleSheetsTable {
    console.log('Raw JSON response preview:', jsonText.substring(0, 500) + '...');
    
    // Google Sheets JSON response can have different formats:
    // 1. /*O_o*/google.visualization.DataTable.setResponse({"version":"0.6","reqId":"0","status":"ok","sig":"1234567890","table":...});
    // 2. /*O_o*/google.visualization.Query.setResponse({"version":"0.6","reqId":"0","status":"ok","sig":"1234567890","table":...});
    // 3. google.visualization.DataTable.setResponse({"version":"0.6",...});
    // 4. google.visualization.Query.setResponse({"version":"0.6",...});
    // 5. Sometimes just the JSON object directly
    
    let jsonData: GoogleSheetsResponse;
    
    // Try to extract JSON from function call format (both DataTable and Query)
    const functionCallMatch = jsonText.match(/google\.visualization\.(?:DataTable|Query)\.setResponse\((.+)\);?\s*$/);
    if (functionCallMatch) {
      console.log('Found function call format');
      try {
        jsonData = JSON.parse(functionCallMatch[1]);
      } catch (e) {
        console.error('Failed to parse JSON from function call:', e);
        throw new Error(`Invalid JSON in Google Sheets response: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    } else {
      // Try to remove the /*O_o*/ prefix and extract JSON
      const cleanedText = jsonText.replace(/^\/\*.*?\*\/\s*/, '');
      
      // Try function call format again after prefix removal (both DataTable and Query)
      const cleanFunctionMatch = cleanedText.match(/google\.visualization\.(?:DataTable|Query)\.setResponse\((.+)\);?\s*$/);
      if (cleanFunctionMatch) {
        console.log('Found function call format after prefix removal');
        try {
          jsonData = JSON.parse(cleanFunctionMatch[1]);
        } catch (e) {
          console.error('Failed to parse JSON from cleaned function call:', e);
          throw new Error(`Invalid JSON in Google Sheets response: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      } else {
        // Try to parse as direct JSON
        try {
          console.log('Attempting direct JSON parse');
          jsonData = JSON.parse(cleanedText);
        } catch {
          console.error('All parsing attempts failed');
          console.log('Cleaned text preview:', cleanedText.substring(0, 500));
          throw new Error(`Invalid Google Sheets JSON response format. Unable to parse response.`);
        }
      }
    }
    
    if (jsonData.status && jsonData.status !== 'ok') {
      throw new Error(`Google Sheets API error: ${jsonData.status}`);
    }
    
    // Return the table data, or the whole object if no table property
    return jsonData.table || jsonData;
  }

  // Convert Google Sheets JSON table to rows array
  static convertJsonToRows(table: GoogleSheetsTable): string[][] {
    const rows: string[][] = [];
    
    if (!table.rows || table.rows.length === 0) {
      return rows;
    }
    
    // Process each row
    for (const row of table.rows) {
      const rowData: string[] = [];
      
      if (row.c) {
        // Process each cell in the row
        for (const cell of row.c) {
          if (cell === null) {
            rowData.push('');
          } else if (cell.v !== undefined) {
            // Use formatted value if available, otherwise raw value
            const cellValue = cell.f || cell.v || '';
            rowData.push(String(cellValue).trim());
          } else {
            rowData.push('');
          }
        }
      }
      
      // Only add non-empty rows
      if (rowData.some(cell => cell.length > 0)) {
        rows.push(rowData);
      }
    }
    
    return rows;
  }

  // Convert JSON table data to our internal format
  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  static parseJsonData(table: GoogleSheetsTable, sheetType: 'unreleased' | 'best' | 'recent' = 'unreleased'): ParsedJsonData {
    const rows = this.convertJsonToRows(table);
    
    // Store era information from headers (will be populated during header processing)
    let eraInfoFromHeaders = new Map();
    
    if (rows.length === 0) {
      return { 
        metadata: {}, 
        columnMap: {}, 
        headers: [], 
        eras: [], 
        tracks: [], 
        statistics: {}, 
        totalRows: 0, 
        dataRows: 0 
      };
    }
    
    console.log('First few rows for analysis:');
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      console.log(`Row ${i}:`, rows[i]);
    }
    
    // Find header row - look for common tracker columns
    let headerRowIndex = -1;
    let headers: string[] = [];
    
    // Look for rows that contain standard tracker column names
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      
      // Check if this row has era, name, and other common columns
      const hasEra = row.some(cell => cell && cell.toLowerCase().trim() === 'era');
      const hasName = row.some(cell => cell && (
        cell.toLowerCase().trim() === 'name' || 
        cell.toLowerCase().trim() === 'track name' ||
        cell.toLowerCase().trim() === 'song name'
      ));
      
      // If we find a row with these key columns, it's likely the header
      if (hasEra && hasName) {
        headerRowIndex = i;
        headers = row.map(cell => cell || '');
        console.log(`Found proper header row at index ${i}`);
        break;
      }
      
      // Alternative: look for rows with multiple expected column patterns
      const columnKeywords = ['era', 'name', 'track', 'song', 'quality', 'link', 'date', 'notes', 'length'];
      const matchCount = row.filter(cell => {
        if (!cell) return false;
        const cellLower = cell.toLowerCase().trim();
        return columnKeywords.some(keyword => cellLower.includes(keyword));
      }).length;
      
      if (matchCount >= 3) { // At least 3 column headers
        headerRowIndex = i;
        headers = row.map(cell => cell || '');
        console.log(`Found likely header row at index ${i} with ${matchCount} matching columns`);
        break;
      }
    }
    
    // If no clear header found, check if first row might be malformed headers
    if (headerRowIndex === -1) {
      // The data might be structured differently - let's check the column labels from the API
      if (table.cols && table.cols.length > 0) {
        console.log('Using column labels from API response');
        
        // Extract era information from column labels before cleaning them
        eraInfoFromHeaders = this.extractEraInfoFromHeaders(table.cols);
        
        headers = table.cols.map((col: GoogleSheetsColumn) => {
          // Extract the actual column name from the label
          let label = col.label || col.id || '';
          
          // Clean up the label - often contains extra text
          if (label.includes('\n')) {
            // Split by newline and take the first clean part
            const parts = label.split('\n');
            label = parts.find((part: string) => part.trim().length > 0 && part.trim().length < 50) || parts[0];
          }
          
          return label.trim();
        });
        
        headerRowIndex = 0; // Start processing from first data row
        console.log('Extracted headers from API:', headers);
        console.log('Extracted era info from headers:', eraInfoFromHeaders);
      } else {
        console.warn('No clear header row found, using first row as headers');
        headerRowIndex = 0;
        headers = rows[0] || [];
      }
    }
    
    console.log('Final headers:', headers);
    console.log('Header row index:', headerRowIndex);
    
    // Extract metadata from the API column labels or early rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata: any = {
      title: '',
      artistName: '',
      description: ''
    };
    
    // Look for metadata in column labels and early rows
    const searchRows = Math.min(headerRowIndex + 10, rows.length);
    for (let i = 0; i < searchRows; i++) {
      const row = rows[i];
      for (const cell of row) {
        if (!cell) continue;
        
        // Extract artist name from tracker title
        if (cell.toLowerCase().includes('tracker')) {
          const cleanTitle = cell.trim()
            .replace(/^\d{1,2}\.\d{1,2}\s+/i, '') // Remove date prefixes
            .replace(/^copy\s+of\s+/i, '') // Remove "Copy of"
            .replace(/\s*-\s*Google\s+(?:preglednice|Spreadsheets?|Sheets?)/i, ''); // Remove Google suffixes
          
          const trackerMatch = cleanTitle.match(/^(.+?)\s+tracker/i);
          if (trackerMatch) {
            metadata.artistName = trackerMatch[1].trim();
          } else {
            metadata.artistName = cleanTitle.replace(/tracker/i, '').trim();
          }
          metadata.title = cell;
        }
        
        // Look for "Ye" references to identify Kanye West
        if (cell.toLowerCase().includes('ye tracker') || cell.toLowerCase().includes('kanye')) {
          metadata.artistName = 'Kanye West (Ye)';
        }
      }
    }
    
    // Also check the API column labels for metadata
    if (table.cols) {
      for (const col of table.cols) {
        const label = col.label || '';
        
        // Look for Ye/Kanye references
        if (label.toLowerCase().includes('ye tracker') || label.toLowerCase().includes('kanye')) {
          metadata.artistName = 'Kanye West (Ye)';
        }
      }
    }
    
    console.log('Extracted metadata:', metadata);
    
    // Create column mapping - be more flexible with matching
    const columnMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      
      if (lowerHeader === 'era' || lowerHeader.includes('era')) {
        columnMap['era'] = index;
      } else if (lowerHeader === 'name' || lowerHeader === 'track name' || lowerHeader === 'song name' || 
                 lowerHeader.includes('name') && !lowerHeader.includes('file')) {
        columnMap['name'] = index;
      } else if (lowerHeader.includes('notes') || lowerHeader.includes('note')) {
        columnMap['notes'] = index;
      } else if (lowerHeader.includes('track length') || lowerHeader.includes('length') || lowerHeader.includes('duration')) {
        columnMap['trackLength'] = index;
      } else if (lowerHeader.includes('leak date') || (lowerHeader.includes('leak') && lowerHeader.includes('date'))) {
        columnMap['leakDate'] = index;
      } else if (lowerHeader.includes('file date') || (lowerHeader.includes('file') && lowerHeader.includes('date'))) {
        columnMap['fileDate'] = index;
      } else if (lowerHeader === 'type' || lowerHeader.includes('type')) {
        columnMap['type'] = index;
      } else if (lowerHeader.includes('portion') || lowerHeader.includes('available')) {
        columnMap['availableLength'] = index;
      } else if (lowerHeader.includes('quality')) {
        columnMap['quality'] = index;
      } else if (lowerHeader.includes('link') || lowerHeader === 'links' || lowerHeader.includes('url')) {
        columnMap['links'] = index;
      }
    });
    
    console.log('Column mapping:', columnMap);
    
    // Process track data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eras = new Map<string, any>();
    let currentEra = '';
    
    // Helper function to get era info from headers
    const getEraHeaderInfo = (eraName: string) => {
      // Try exact match first
      if (eraInfoFromHeaders.has(eraName)) {
        return eraInfoFromHeaders.get(eraName)!;
      }
      
      // Try partial matches for era variants
      for (const [headerEra, info] of eraInfoFromHeaders.entries()) {
        if (eraName.toLowerCase().includes(headerEra.toLowerCase()) || 
            headerEra.toLowerCase().includes(eraName.toLowerCase())) {
          return info;
        }
      }
      
      return { description: undefined, timeline: undefined };
    };
    
    // Find where main data ends (look for footer sections)
    let mainDataEnd = rows.length;
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      const firstCell = row[0] ? row[0].trim().toLowerCase() : '';
      
      if (firstCell.includes('update notes') || 
          firstCell.includes('total links') || 
          firstCell.includes('quality summary') ||
          firstCell.includes('availability') ||
          firstCell.includes('tracker guidelines')) {
        mainDataEnd = i;
        break;
      }
    }
    
    console.log(`Processing rows ${headerRowIndex + 1} to ${mainDataEnd}`);
    
    // Process each row
    for (let i = headerRowIndex + 1; i < mainDataEnd; i++) {
      const row = rows[i];
      
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        continue; // Skip empty rows
      }
      
      const eraValue = columnMap['era'] !== undefined ? (row[columnMap['era']] || '').trim() : '';
      const nameValue = columnMap['name'] !== undefined ? (row[columnMap['name']] || '').trim() : '';
      const notesValue = columnMap['notes'] !== undefined ? (row[columnMap['notes']] || '') : '';
      const trackLengthValue = columnMap['trackLength'] !== undefined ? (row[columnMap['trackLength']] || '') : '';
      const fileDateValue = columnMap['fileDate'] !== undefined ? (row[columnMap['fileDate']] || '') : '';
      const leakDateValue = columnMap['leakDate'] !== undefined ? (row[columnMap['leakDate']] || '') : '';
      const availableLengthValue = columnMap['availableLength'] !== undefined ? (row[columnMap['availableLength']] || '') : '';
      const qualityValue = columnMap['quality'] !== undefined ? (row[columnMap['quality']] || '') : '';
      const typeValue = columnMap['type'] !== undefined ? (row[columnMap['type']] || '') : '';
      const linksValue = columnMap['links'] !== undefined ? (row[columnMap['links']] || '') : '';
      
      // Debug first few rows
      if (i < headerRowIndex + 10) {
        console.log(`Row ${i} - Era: "${eraValue}", Name: "${nameValue}", Quality: "${qualityValue}"`);
        console.log(`Full row:`, row);
      }
      
      // Skip template/instruction rows
      const isTemplateRow = nameValue.toLowerCase().includes('how to') ||
                           nameValue.toLowerCase().includes('template') ||
                           nameValue.toLowerCase().includes('add a new entry') ||
                           eraValue.toLowerCase().includes('template era');
      
      if (isTemplateRow) {
        console.log(`Skipping template row: ${nameValue}`);
        continue;
      }
      
      // Different approach: in this tracker, the era name appears to be in the first column
      // and track names are in the second column
      // Let's look at the actual structure more carefully
      
      const firstCol = row[0] ? row[0].trim() : '';
      const secondCol = row[1] ? row[1].trim() : '';
      
      // Skip footer/navigation rows
      const isFooterRow = firstCol.toLowerCase() === 'links' ||
                         firstCol.toLowerCase() === 'availability' ||
                         secondCol.toLowerCase() === 'availability' ||
                         (firstCol.toLowerCase().includes('link') && secondCol.toLowerCase().includes('availabilit')) ||
                         nameValue.toLowerCase() === 'availability';
      
      if (isFooterRow) {
        console.log(`Skipping template/footer row: Era="${firstCol}", Name="${secondCol}"`);
        continue;
      }
      
      // Check if this is a sub-era row
      // Sub-eras should only be detected for explicit patterns, not timeline entries
      const isSubEraRow = firstCol && 
                         (firstCol.toLowerCase().includes('sub-era') || firstCol.toLowerCase() === 'another:') &&
                         secondCol && 
                         !secondCol.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && // Second col is not a date
                         !secondCol.includes('http'); // Not a URL
      
      if (isSubEraRow) {
        // This is an explicit sub-era - treat it as a separate era with parent relationship
        let subEraName = secondCol.trim();
        
        // Clean up the sub-era name
        if (subEraName.includes('\n')) {
          const lines = subEraName.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          subEraName = lines[0];
        }
        
        // If we have a parent era, create a combined name
        if (currentEra) {
          subEraName = `${currentEra}: ${subEraName}`;
        }
        
        currentEra = subEraName;
        console.log(`Found explicit sub-era: ${currentEra}`);
        
        // Extract timeline info from other columns for sub-era
        let subEraNotes = '';
        let subEraDescription = '';
        
        for (let j = 2; j < row.length; j++) {
          const cell = row[j] || '';
          if (!cell.trim()) continue;
          
          // Timeline info
          if (cell.includes('(') && cell.includes(')')) {
            const hasDatePattern = cell.match(/\(\d{1,2}\/\d{1,2}\/\d{4}\)|(\?\?\?\?\?\?\?\?)/);
            if (hasDatePattern && !subEraNotes) {
              subEraNotes = cell;
            }
          } else if (!cell.includes('http') && cell.length > 10 && !subEraDescription) {
            subEraDescription = cell;
          }
        }
        
        // Get header information for this era
        const headerInfo = getEraHeaderInfo(currentEra);
        
        eras.set(currentEra, {
          name: currentEra,
          alternateNames: [],
          description: headerInfo.description || subEraDescription,
          notes: headerInfo.timeline || subEraNotes,
          picture: '',
          tracks: []
        });
        continue;
      }
      
      // Check if this is an era metadata row
      // Pattern: First column has file counts (possibly multi-line), second column has era name
      const isMetadataRow = firstCol && 
                           (firstCol.match(/\d+\s+(?:OG File|Full|Tagged|Partial|Snippet|Stem Bounce|Unavailable)/i) ||
                            firstCol.includes('OG File') || firstCol.includes('Unavailable') || 
                            firstCol.match(/^\d+.*\n.*\d+.*\n/)) && // Multi-line format
                           secondCol && 
                           !secondCol.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && // Second col is not a date
                           !secondCol.match(/^\w{3}\s+\d{1,2},\s+\d{4}$/) && // Not "Jul 31, 2017" format
                           !secondCol.includes('http'); // Not a URL
      
      if (isMetadataRow) {
        // Parse the era name to extract main name, alternate names, and description
        const eraNameInfo = GoogleDocsParser.parseEraName(secondCol);
        
        currentEra = eraNameInfo.mainName;
        console.log(`Found era with metadata: ${currentEra}`);
        console.log(`Original era text: ${secondCol}`);
        console.log(`Alternate names: ${eraNameInfo.alternateNames.join(', ')}`);
        console.log(`Metadata: ${firstCol}`);
        
        // Parse metadata from first column
        const metadata = this.parseEraMetadata(firstCol);
        
        // Extract era image and description from other columns
        let eraImage = '';
        let eraDescription = '';
        let eraNotes = '';
        
        for (let j = 2; j < row.length; j++) {
          const cell = row[j] || '';
          if (!cell.trim()) continue;
          
          // Look for image URLs
          const imageMatch = cell.match(/https?:\/\/[^\s"'<>()]+\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)/i) ||
                           cell.match(/https?:\/\/drive\.google\.com\/[^\s"'<>()]+/i) ||
                           cell.match(/https?:\/\/lh[0-9]+\.googleusercontent\.com\/[^\s"'<>()]+/i);
          if (imageMatch && !eraImage) {
            eraImage = imageMatch[0];
          }
          
          // Separate notes (in parentheses with dates) from description
          if (cell.includes('(') && cell.includes(')')) {
            // Check if this looks like a timeline entry with dates
            const hasDatePattern = cell.match(/\(\d{1,2}\/\d{1,2}\/\d{4}\)|(\?\?\?\?\?\?\?\?)/);
            if (hasDatePattern && !eraNotes) {
              eraNotes = cell;
            } else if (!eraNotes) {
              eraNotes = cell;
            }
          } else if (!cell.includes('http') && cell.length > 10 && !eraDescription) {
            eraDescription = cell;
          }
        }
        
        // Get header information for this era
        const headerInfo = getEraHeaderInfo(currentEra);
        
        // Update existing era if it exists, otherwise create new one
        if (eras.has(currentEra)) {
          const existingEra = eras.get(currentEra)!;
          eras.set(currentEra, {
            ...existingEra,
            description: headerInfo.description || eraNameInfo.description || eraDescription || existingEra.description,
            notes: headerInfo.timeline || eraNotes || existingEra.notes,
            picture: eraImage || existingEra.picture,
            alternateNames: eraNameInfo.alternateNames,
            metadata: metadata
          });
        } else {
          eras.set(currentEra, {
            name: currentEra,
            alternateNames: eraNameInfo.alternateNames,
            description: headerInfo.description || eraNameInfo.description || eraDescription,
            notes: headerInfo.timeline || eraNotes,
            picture: eraImage,
            metadata: metadata,
            tracks: []
          });
        }
        continue;
      }
      
      // Check if first column contains an era name (fallback for eras without metadata)
      const isEraName = firstCol && 
                       !firstCol.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && // Not a date
                       !firstCol.match(/^\w{3}\s+\d{1,2},\s+\d{4}$/) && // Not "Jul 31, 2017" format
                       !firstCol.match(/^\d+:\d+$/) && // Not a time
                       !firstCol.includes('http') && // Not a URL
                       !firstCol.match(/\d+\s+(?:OG File|Full|Tagged|Partial|Snippet|Stem Bounce|Unavailable)/i) && // Not metadata
                       !firstCol.toLowerCase().includes('timeline') && // Not timeline info
                       !firstCol.toLowerCase().includes('template') && // Not template rows
                       !firstCol.toLowerCase().includes('how to') && // Not instruction rows
                       !secondCol; // Second column is empty (indicates era row)
      
      // Check if this is an era row - fallback for eras without metadata
      if (isEraName && !secondCol) {
        // Parse the era name to extract main name and alternate names
        const eraNameInfo = GoogleDocsParser.parseEraName(firstCol);
        currentEra = eraNameInfo.mainName;
        console.log(`Found era without metadata: ${currentEra}`);
        
        // Extract era image, description, and notes from other columns
        let eraImage = '';
        let eraDescription = '';
        let eraNotes = '';
        
        for (let j = 2; j < row.length; j++) {
          const cell = row[j];
          if (!cell || !cell.trim()) continue;
          
          // Look for image URLs
          const imageMatch = cell.match(/https?:\/\/[^\s"'<>()]+\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)/i) ||
                           cell.match(/https?:\/\/drive\.google\.com\/[^\s"'<>()]+/i) ||
                           cell.match(/https?:\/\/lh[0-9]+\.googleusercontent\.com\/[^\s"'<>()]+/i);
          if (imageMatch && !eraImage) {
            eraImage = imageMatch[0];
            continue;
          }
          
          // Look for timeline/date information (notes)
          if (cell.includes('(') && cell.includes(')')) {
            const hasDatePattern = cell.match(/\(\d{1,2}\/\d{1,2}\/\d{4}\)|(\?\?\?\?\?\?\?\?)/);
            if (hasDatePattern) {
              if (!eraNotes) {
                eraNotes = cell;
              } else {
                eraNotes += '\n' + cell;
              }
              continue;
            }
          }
          
          // Use remaining non-URL text as description
          if (!cell.includes('http') && cell.length > 5) {
            if (!eraDescription) {
              eraDescription = cell;
            } else {
              // If we already have a description, add this as notes
              if (!eraNotes) {
                eraNotes = cell;
              } else {
                eraNotes += '\n' + cell;
              }
            }
          }
        }
        
        // Get header information for this era
        const headerInfo = getEraHeaderInfo(currentEra);
        
        // Combine description from era name and additional columns
        const finalDescription = headerInfo.description || eraNameInfo.description || eraDescription || '';
        const finalNotes = headerInfo.timeline || eraNotes || notesValue || '';
        
        console.log(`Era "${currentEra}" - Description: "${finalDescription}", Notes: "${finalNotes}"`);
        
        eras.set(currentEra, {
          name: currentEra,
          alternateNames: eraNameInfo.alternateNames,
          description: finalDescription,
          notes: finalNotes,
          picture: eraImage,
          tracks: []
        });
        continue;
      }
      
      // Check if this is additional era information (description, timeline, etc.)
      // These should be added to the current era if one exists
      if (currentEra && eras.has(currentEra) && firstCol && !secondCol) {
        const currentEraData = eras.get(currentEra)!;
        
        // Check if this looks like a sub-era timeline entry (like "Black Friday" with dates)
        const hasTimelineInfo = row.some((cell, idx) => idx > 1 && cell && cell.includes('(') && cell.includes(')'));
        
        if (hasTimelineInfo) {
          // This is a timeline entry - combine the sub-era name with timeline info
          let timelineEntry = firstCol;
          
          // Add timeline information from other columns
          for (let j = 2; j < row.length; j++) {
            const cell = row[j] || '';
            if (cell.trim() && (cell.includes('(') && cell.includes(')'))) {
              timelineEntry += '\n' + cell;
            }
          }
          
          if (!currentEraData.notes) {
            currentEraData.notes = timelineEntry;
          } else {
            currentEraData.notes += '\n' + timelineEntry;
          }
          
          console.log(`Added timeline entry to ${currentEra}: ${firstCol}`);
        }
        // If it's timeline info, add to notes
        else if (firstCol.toLowerCase().includes('timeline') || 
            (firstCol.includes('(') && firstCol.includes(')')) ||
            firstCol.match(/\(\d{1,2}\/\d{1,2}\/\d{4}\)/) || 
            firstCol.match(/\(\?\?\?\?\?\?\?\?\)/)) {
          if (!currentEraData.notes) {
            currentEraData.notes = firstCol;
          } else {
            currentEraData.notes += '\n' + firstCol;
          }
        } 
        // If it looks like an alternate title/description, add to description
        else if (firstCol.includes('(') || firstCol.length > 10) {
          if (!currentEraData.description) {
            currentEraData.description = firstCol;
          } else {
            currentEraData.description += ' ' + firstCol;
          }
        }
        
        // Update the era data
        eras.set(currentEra, currentEraData);
        continue;
      }
      
      // If we have a track name (second column), this is a track row
      if (secondCol) {
        // The era might be in the first column of this row, or we use the current era
        let trackEra = currentEra;
        
        // If first column has content and it's not a track detail, it might be an era
        if (firstCol && firstCol !== secondCol && !firstCol.match(/^\d+:\d+$/) && !firstCol.includes('http')) {
          // Check if this looks like an era name
          const looksLikeEra = !firstCol.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && 
                              !firstCol.match(/^\w{3}\s+\d{1,2},\s+\d{4}$/) &&
                              firstCol.length > 3;
          
          if (looksLikeEra) {
            trackEra = firstCol;
            currentEra = firstCol;
            
            // Create era if it doesn't exist
            if (!eras.has(currentEra)) {
              eras.set(currentEra, {
                name: currentEra,
                description: '',
                picture: '',
                tracks: []
              });
            } else {
              // If era exists but is the same name, use the existing one
              const existingEra = eras.get(currentEra)!;
              trackEra = existingEra.name;
              currentEra = existingEra.name;
            }
          }
        }
        
        // Ensure we have a current era
        if (!trackEra) {
          trackEra = 'Miscellaneous';
          currentEra = trackEra;
          if (!eras.has(currentEra)) {
            eras.set(currentEra, {
              name: currentEra,
              alternateNames: [],
              description: '',
              picture: '',
              tracks: []
            });
          }
        }
        
        // Create track object using the second column as the name
        const parsedTitle = GoogleDocsParser.parseTrackTitle(secondCol);
        
        // Standardize quality
        const standardizedQuality = GoogleDocsParser.standardizeQuality(
          typeValue && qualityValue ? `${typeValue} - ${qualityValue}` : qualityValue || typeValue || ''
        );
        
        // Process and categorize links
        const rawLinks = linksValue ? linksValue.split(/[,\n]/).map(link => link.trim()).filter(link => link) : [];
        const processedLinks = rawLinks.map(link => {
          const linkInfo = GoogleDocsParser.categorizeLink(link);
          return {
            url: link,
            platform: linkInfo.platform,
            type: linkInfo.type,
            isValid: linkInfo.isValid
          };
        });
        
        // Parse dates with improved parsing
        const parsedFileDate = GoogleDocsParser.parseTrackDate(fileDateValue);
        const parsedLeakDate = GoogleDocsParser.parseTrackDate(leakDateValue);
        
        const track = {
          era: trackEra,
          name: secondCol,
          title: parsedTitle,
          rawName: secondCol,
          notes: notesValue,
          trackLength: trackLengthValue,
          fileDate: parsedFileDate ? parsedFileDate.toISOString().split('T')[0] : fileDateValue,
          leakDate: parsedLeakDate ? parsedLeakDate.toISOString().split('T')[0] : leakDateValue,
          availableLength: availableLengthValue,
          quality: standardizedQuality,
          type: typeValue,
          links: processedLinks.length > 0 ? processedLinks : rawLinks.map(url => ({ url, type: 'unknown' })),
          isSpecial: secondCol.includes('🏆') || secondCol.includes('✨') || secondCol.includes('⭐'),
          specialType: secondCol.includes('⭐') ? '⭐' : 
                      secondCol.includes('✨') ? '✨' : 
                      secondCol.includes('🏆') ? '🏆' : undefined,
          // Add metadata for better filtering and sorting
          dateObj: parsedLeakDate || parsedFileDate, // For sorting recent tracks
          linkCount: rawLinks.length,
          hasValidLinks: processedLinks.some(link => link.isValid)
        };
        
        console.log(`Adding track: ${secondCol} to era: ${trackEra}`);
        tracks.push(track);
        
        // Ensure the era exists and add the track to it
        if (eras.has(trackEra)) {
          eras.get(trackEra)!.tracks.push(track);
        } else {
          console.warn(`Era ${trackEra} not found in eras map when adding track ${secondCol}`);
          // Create the era if it doesn't exist
          const headerInfo = getEraHeaderInfo(trackEra);
          eras.set(trackEra, {
            name: trackEra,
            alternateNames: [],
            description: headerInfo.description || '',
            notes: headerInfo.timeline || '',
            picture: '',
            tracks: [track]
          });
        }
      }
    }
    
    console.log(`Found ${eras.size} eras with ${tracks.length} total tracks`);
    
    // Parse statistics from the end of the sheet
    const statistics = GoogleDocsParser.parseStatistics(rows, mainDataEnd);
    
    return {
      metadata,
      columnMap,
      headers,
      eras: Array.from(eras.values()),
      tracks,
      statistics,
      totalRows: rows.length,
        dataRows: mainDataEnd - headerRowIndex - 1
    };
  }

  // Parse track title to extract main name, features, collaborators, producers, and alternate names
  static parseTrackTitle(rawTitle: string): TrackTitle {
    if (!rawTitle) {
      return {
        main: 'Unknown',
        isUnknown: true,
        features: [],
        collaborators: [],
        producers: [],
        references: [],
        alternateNames: []
      };
    }

    let title = rawTitle.trim();
    const features: string[] = [];
    const collaborators: string[] = [];
    const producers: string[] = [];
    const references: string[] = [];
    const alternateNames: string[] = [];
    
    // Extract content from parentheses - this is where alternate names usually are
    const parenMatches = title.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      for (const parenMatch of parenMatches) {
        const content = parenMatch.slice(1, -1); // Remove parentheses
        
        // Check if it's a reference (Ref.) - add to references
        if (content.match(/\b(?:ref\.?|reference)\s+(.+)/i)) {
          const refMatch = content.match(/\b(?:ref\.?|reference)\s+(.+)/i);
          if (refMatch) {
            references.push(refMatch[1].trim());
            title = title.replace(parenMatch, '').trim();
            continue;
          }
        }
        
        // Enhanced production credit detection
        if (content.match(/\b(?:prod\.?|produced|production)\s+(?:by\s+)?(.+)/i)) {
          const prodMatch = content.match(/\b(?:prod\.?|produced|production)\s+(?:by\s+)?(.+)/i);
          if (prodMatch) {
            // Split multiple producers by & or ,
            const prodList = prodMatch[1].split(/\s*[&,]\s*/).map(p => p.trim()).filter(p => p.length > 0);
            producers.push(...prodList);
            title = title.replace(parenMatch, '').trim();
            continue;
          }
        }
        
        // Enhanced feature detection
        if (content.match(/\b(?:ft\.?|feat\.?|featuring)\s+(.+)/i)) {
          const featMatch = content.match(/\b(?:ft\.?|feat\.?|featuring)\s+(.+)/i);
          if (featMatch) {
            // Split multiple features by & or ,
            const featList = featMatch[1].split(/\s*[&,]\s*/).map(f => f.trim()).filter(f => f.length > 0);
            features.push(...featList);
            title = title.replace(parenMatch, '').trim();
            continue;
          }
        }
        
        // Enhanced collaboration detection
        if (content.match(/\b(?:with|w\/)\s+(.+)/i)) {
          const withMatch = content.match(/\b(?:with|w\/)\s+(.+)/i);
          if (withMatch) {
            // Split multiple collaborators by & or ,
            const collabList = withMatch[1].split(/\s*[&,]\s*/).map(c => c.trim()).filter(c => c.length > 0);
            collaborators.push(...collabList);
            title = title.replace(parenMatch, '').trim();
            continue;
          }
        }
        
        // Check if it's a quality/technical indicator first
        if (content.match(/\b(?:\d+(?:k|m|g)?b|lossless|flac|mp3|wav|m4a|aac|ogg|\d+hz|\d+kbps|[\d:]+)\b/i)) {
          // This is technical info, not an alternate name
          continue;
        }
        
        // Check if it contains ONLY version info that's NOT an alternate name
        if (content.match(/^\s*(?:demo|snippet|mix|edit|remix|instrumental|live|acoustic|radio|clean|explicit|final|original|extended|short|full|leak|cdq|hq)\s*$/i)) {
          // This is ONLY version info, not an alternate name
          continue;
        }
        
        // Everything else in parentheses should be treated as alternate names
        // If it contains commas, it's likely multiple alternate names
        if (content.includes(',')) {
          const altTitles = content.split(',').map(alt => alt.trim()).filter(alt => alt.length > 0);
          alternateNames.push(...altTitles);
          title = title.replace(parenMatch, '').trim();
        } else if (content.length > 1) { // Single alternate name (allow single words)
          alternateNames.push(content.trim());
          title = title.replace(parenMatch, '').trim();
        }
      }
    }
    
    // Clean up title after parentheses removal
    title = title.replace(/\s+/g, ' ').trim();
    
    // Handle artist collaborations - extract main track name
    // If title starts with "Artist Name - Track Name", extract just the track name
    const artistCollabMatch = title.match(/^[^-]+ - (.+)$/);
    if (artistCollabMatch) {
      title = artistCollabMatch[1].trim();
    }
    
    // Extract features from the main title (outside parentheses)
    const featInTitle = title.match(/\s+(?:ft\.?|feat\.?|featuring)\s+(.+?)(?:\s+(?:prod\.?|produced|with|w\/)|$)/i);
    if (featInTitle) {
      features.push(featInTitle[1].trim());
      title = title.replace(featInTitle[0], '').trim();
    }
    
    // Extract collaborations from main title
    const withInTitle = title.match(/\s+(?:with|w\/)\s+(.+?)(?:\s+(?:prod\.?|produced|ft\.?|feat\.?|featuring)|$)/i);
    if (withInTitle) {
      collaborators.push(withInTitle[1].trim());
      title = title.replace(withInTitle[0], '').trim();
    }
    
    // Extract production credits from main title
    const prodInTitle = title.match(/\s+(?:prod\.?|produced|production)\s+(?:by\s+)?(.+)$/i);
    if (prodInTitle) {
      producers.push(prodInTitle[1].trim());
      title = title.replace(prodInTitle[0], '').trim();
    }
    
    return {
      main: title || 'Unknown',
      isUnknown: (title || '').includes('???') || !title || title.toLowerCase().includes('unknown'),
      features,
      collaborators,
      producers,
      references,
      alternateNames
    };
  }

  // Parse track date from various date formats with enhanced normalization
  static parseTrackDate(dateString: string): Date | null {
    if (!dateString || dateString.trim() === '') {
      return null;
    }

    // Remove extra whitespace, parentheses, and common prefixes
    const cleanDate = dateString.trim()
      .replace(/[()]/g, '')
      .replace(/^(leaked?|released?|recorded?|date[d]?:?)\s*/i, '')
      .trim();
    
    // Handle relative dates like "Yesterday", "Last week", etc.
    const now = new Date();
    const relativeMap: Record<string, number> = {
      'today': 0,
      'yesterday': -1,
      'last week': -7,
      'last month': -30,
      'last year': -365
    };
    
    const cleanLower = cleanDate.toLowerCase();
    for (const [relative, days] of Object.entries(relativeMap)) {
      if (cleanLower.includes(relative)) {
        const date = new Date(now);
        date.setDate(date.getDate() + days);
        return date;
      }
    }
    
    // Try various date formats commonly found in trackers
    const dateFormats = [
      // MM/DD/YYYY or M/D/YYYY
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, handler: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])) },
      // DD/MM/YYYY or D/M/YYYY (European format - try both interpretations)
      { pattern: /(\d{1,2})\.(\d{1,2})\.(\d{4})/, handler: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])) },
      // YYYY-MM-DD (ISO format)
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/, handler: (m: RegExpMatchArray) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) },
      // Month DD, YYYY (e.g., "Apr 22, 2009")
      { pattern: /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/, handler: (m: RegExpMatchArray) => new Date(`${m[1]} ${m[2]}, ${m[3]}`) },
      // DD Month YYYY (e.g., "22 April 2009")
      { pattern: /(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/, handler: (m: RegExpMatchArray) => new Date(`${m[2]} ${m[1]}, ${m[3]}`) },
      // Month YYYY (e.g., "April 2009")
      { pattern: /([A-Za-z]{3,9})\s+(\d{4})/, handler: (m: RegExpMatchArray) => new Date(`${m[1]} 1, ${m[2]}`) },
      // Just year YYYY
      { pattern: /^(\d{4})$/, handler: (m: RegExpMatchArray) => new Date(parseInt(m[1]), 0, 1) },
      // Quarter format (Q1 2023, etc.)
      { pattern: /q(\d)\s+(\d{4})/i, handler: (m: RegExpMatchArray) => {
        const quarter = parseInt(m[1]);
        const year = parseInt(m[2]);
        const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
        return new Date(year, month, 1);
      }}
    ];

    for (const format of dateFormats) {
      const match = cleanDate.match(format.pattern);
      if (match) {
        try {
          const date = format.handler(match);
          if (!isNaN(date.getTime()) && 
              date.getFullYear() >= 1990 && 
              date.getFullYear() <= new Date().getFullYear() + 5) {
            return date;
          }
        } catch (e) {
          // Continue to next format
          continue;
        }
      }
    }

    return null;
  }

  // Parse era name and extract alternate names
  static parseEraName(rawEraName: string): { mainName: string; alternateNames: string[]; description?: string } {
    if (!rawEraName) {
      return { mainName: 'Unknown Era', alternateNames: [] };
    }

    let workingName = rawEraName.trim();
    const alternateNames: string[] = [];
    let description: string | undefined;

    // Handle multiline era names
    if (workingName.includes('\n')) {
      const lines = workingName.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      workingName = lines[0]; // Take the first line as the main era name
      
      // Additional lines that aren't parenthetical might be descriptions
      const additionalInfo = lines.slice(1).filter(line => 
        !line.match(/^\([^)]*\)$/) // Not just parenthetical content
      ).join(' ');
      
      if (additionalInfo.trim()) {
        description = additionalInfo.trim();
      }
    }

    // Extract alternate names from parentheses
    const parenMatches = workingName.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      for (const parenMatch of parenMatches) {
        const content = parenMatch.slice(1, -1); // Remove parentheses
        
        // Check if it contains commas (multiple alternate names)
        if (content.includes(',')) {
          const altNames = content.split(',').map(name => name.trim()).filter(name => name.length > 0);
          alternateNames.push(...altNames);
        } else if (content.trim().length > 0) {
          alternateNames.push(content.trim());
        }
      }
    }

    // Remove all parenthetical content to get the main name
    const mainName = workingName.replace(/\s*\([^)]*\)/g, '').trim();

    return {
      mainName: mainName || 'Unknown Era',
      alternateNames,
      description
    };
  }

  // Standardize quality values to consistent format
  static standardizeQuality(rawQuality: string): string {
    if (!rawQuality) return '';
    
    const quality = rawQuality.toLowerCase().trim();
    
    // Quality mapping for consistency
    const qualityMap: Record<string, string> = {
      'hq': 'High Quality',
      'high quality': 'High Quality',
      'highquality': 'High Quality',
      'hi-q': 'High Quality',
      'lq': 'Low Quality',
      'low quality': 'Low Quality',
      'lowquality': 'Low Quality',
      'lo-q': 'Low Quality',
      'cdq': 'CD Quality',
      'cd quality': 'CD Quality',
      'cd-quality': 'CD Quality',
      'lossless': 'Lossless',
      'flac': 'Lossless',
      'wav': 'Lossless',
      'recording': 'Recording',
      'recorded': 'Recording',
      'rec': 'Recording',
      'not available': 'Not Available',
      'n/a': 'Not Available',
      'na': 'Not Available',
      'unavailable': 'Not Available',
      'snippet': 'Snippet',
      'snip': 'Snippet',
      'partial': 'Partial',
      'full': 'Full',
      'complete': 'Full',
      'og': 'OG File',
      'original': 'OG File',
      'tagged': 'Tagged',
      'stem': 'Stem',
      'bounce': 'Stem Bounce',
      'stem bounce': 'Stem Bounce'
    };
    
    // Check for exact matches first
    if (qualityMap[quality]) {
      return qualityMap[quality];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(qualityMap)) {
      if (quality.includes(key)) {
        return value;
      }
    }
    
    // Return original with proper capitalization if no match
    return rawQuality.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Categorize and validate links by platform
  static categorizeLink(url: string): { platform: string; type: string; isValid: boolean } {
    if (!url || !url.trim()) {
      return { platform: 'Unknown', type: 'unknown', isValid: false };
    }
    
    const cleanUrl = url.trim().toLowerCase();
    
    // Platform detection
    if (cleanUrl.includes('pillows.su') || cleanUrl.includes('pillowcase.su') || 
        cleanUrl.includes('pillowcases.su') || cleanUrl.includes('pillowcases.top')) {
      return { platform: 'Pillowcase', type: 'download', isValid: true };
    } else if (cleanUrl.includes('soundcloud.com')) {
      return { platform: 'SoundCloud', type: 'stream', isValid: true };
    } else if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      return { platform: 'YouTube', type: 'stream', isValid: true };
    } else if (cleanUrl.includes('spotify.com')) {
      return { platform: 'Spotify', type: 'stream', isValid: true };
    } else if (cleanUrl.includes('apple.com') || cleanUrl.includes('music.apple.com')) {
      return { platform: 'Apple Music', type: 'stream', isValid: true };
    } else if (cleanUrl.includes('drive.google.com')) {
      return { platform: 'Google Drive', type: 'download', isValid: true };
    } else if (cleanUrl.includes('dropbox.com')) {
      return { platform: 'Dropbox', type: 'download', isValid: true };
    } else if (cleanUrl.includes('mega.nz')) {
      return { platform: 'MEGA', type: 'download', isValid: true };
    } else if (cleanUrl.includes('music.froste.lol')) {
      return { platform: 'Froste', type: 'download', isValid: true };
    } else if (cleanUrl.includes('facebook.com')) {
      return { platform: 'Facebook', type: 'social', isValid: true };
    } else if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) {
      return { platform: 'Twitter/X', type: 'social', isValid: true };
    } else if (cleanUrl.includes('instagram.com')) {
      return { platform: 'Instagram', type: 'social', isValid: true };
    } else if (cleanUrl.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
      return { platform: 'Direct', type: 'audio', isValid: true };
    } else if (cleanUrl.startsWith('http')) {
      return { platform: 'Web', type: 'web', isValid: true };
    }
    
    return { platform: 'Unknown', type: 'unknown', isValid: false };
  }
  // Parse era metadata string to extract file counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static parseEraMetadata(metadataString: string): any {
    const metadata = {
      ogFiles: 0,
      fullFiles: 0,
      taggedFiles: 0,
      partialFiles: 0,
      snippetFiles: 0,
      stemBounceFiles: 0,
      unavailableFiles: 0
    };

    if (!metadataString) return metadata;

    // Handle multi-line format by normalizing the string first
    const normalizedString = metadataString.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    console.log('Parsing era metadata:', normalizedString);

    // Extract different file type counts using regex (more flexible patterns)
    const ogMatch = normalizedString.match(/(\d+)\s+(?:OG\s+File(?:\(s\))?)/i);
    if (ogMatch) metadata.ogFiles = parseInt(ogMatch[1]);

    const fullMatch = normalizedString.match(/(\d+)\s+Full(?!\s+File)/i);
    if (fullMatch) metadata.fullFiles = parseInt(fullMatch[1]);

    const taggedMatch = normalizedString.match(/(\d+)\s+Tagged/i);
    if (taggedMatch) metadata.taggedFiles = parseInt(taggedMatch[1]);

    const partialMatch = normalizedString.match(/(\d+)\s+Partial/i);
    if (partialMatch) metadata.partialFiles = parseInt(partialMatch[1]);

    const snippetMatch = normalizedString.match(/(\d+)\s+Snippet(?:\(s\))?/i);
    if (snippetMatch) metadata.snippetFiles = parseInt(snippetMatch[1]);

    const stemMatch = normalizedString.match(/(\d+)\s+Stem\s+Bounce(?:\(s\))?/i);
    if (stemMatch) metadata.stemBounceFiles = parseInt(stemMatch[1]);

    const unavailableMatch = normalizedString.match(/(\d+)\s+Unavailable/i);
    if (unavailableMatch) metadata.unavailableFiles = parseInt(unavailableMatch[1]);

    console.log('Parsed metadata:', metadata);
    return metadata;
  }

  // Parse statistics from the footer section of the spreadsheet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static parseStatistics(rows: string[][], startIndex: number): any {
    const statistics = {
      links: {
        total: 0,
        missing: 0,
        sourcesNeeded: 0,
        notAvailable: 0
      },
      quality: {
        lossless: 0,
        cdQuality: 0,
        highQuality: 0,
        lowQuality: 0,
        recordings: 0,
        notAvailable: 0
      },
      availability: {
        totalFull: 0,
        ogFiles: 0,
        stemBounces: 0,
        full: 0,
        tagged: 0,
        partial: 0,
        snippets: 0,
        unavailable: 0
      },
      highlighted: {
        bestOf: 0,
        special: 0,
        wanted: 0
      }
    };

    // Look for statistics in the footer rows
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      for (const cell of row) {
        if (!cell) continue;

        // Parse links statistics
        const linksMatch = cell.match(/(\d+)\s+Total\s+Links/i);
        if (linksMatch) {
          statistics.links.total = parseInt(linksMatch[1]);
        }
        const missingLinksMatch = cell.match(/(\d+)\s+Missing\s+Links/i);
        if (missingLinksMatch) {
          statistics.links.missing = parseInt(missingLinksMatch[1]);
        }
        const sourcesMatch = cell.match(/(\d+)\s+Sources\s+Needed/i);
        if (sourcesMatch) {
          statistics.links.sourcesNeeded = parseInt(sourcesMatch[1]);
        }
        const notAvailableLinksMatch = cell.match(/(\d+)\s+Not\s+Avaliable/i);
        if (notAvailableLinksMatch) {
          statistics.links.notAvailable = parseInt(notAvailableLinksMatch[1]);
        }

        // Parse quality statistics
        const losslessMatch = cell.match(/(\d+)\s+Lossless/i);
        if (losslessMatch) {
          statistics.quality.lossless = parseInt(losslessMatch[1]);
        }
        const cdQualityMatch = cell.match(/(\d+)\s+CD\s+Quality/i);
        if (cdQualityMatch) {
          statistics.quality.cdQuality = parseInt(cdQualityMatch[1]);
        }
        const highQualityMatch = cell.match(/(\d+)\s+High\s+Quality/i);
        if (highQualityMatch) {
          statistics.quality.highQuality = parseInt(highQualityMatch[1]);
        }
        const lowQualityMatch = cell.match(/(\d+)\s+Low\s+Quality/i);
        if (lowQualityMatch) {
          statistics.quality.lowQuality = parseInt(lowQualityMatch[1]);
        }
        const recordingsMatch = cell.match(/(\d+)\s+Recordings/i);
        if (recordingsMatch) {
          statistics.quality.recordings = parseInt(recordingsMatch[1]);
        }
        const notAvailableQualityMatch = cell.match(/(\d+)\s+Not\s+Available/i);
        if (notAvailableQualityMatch && !cell.includes('Links')) {
          statistics.quality.notAvailable = parseInt(notAvailableQualityMatch[1]);
        }

        // Parse availability statistics
        const totalFullMatch = cell.match(/(\d+)\s+Total\s+Full/i);
        if (totalFullMatch) {
          statistics.availability.totalFull = parseInt(totalFullMatch[1]);
        }
        const ogFilesMatch = cell.match(/(\d+)\s+OG\s+Files/i);
        if (ogFilesMatch) {
          statistics.availability.ogFiles = parseInt(ogFilesMatch[1]);
        }
        const stemBouncesMatch = cell.match(/(\d+)\s+Stem\s+Bounces/i);
        if (stemBouncesMatch) {
          statistics.availability.stemBounces = parseInt(stemBouncesMatch[1]);
        }
        const fullMatch = cell.match(/(\d+)\s+Full(?!\s)/i);
        if (fullMatch && !cell.includes('Total')) {
          statistics.availability.full = parseInt(fullMatch[1]);
        }
        const taggedMatch = cell.match(/(\d+)\s+Tagged/i);
        if (taggedMatch) {
          statistics.availability.tagged = parseInt(taggedMatch[1]);
        }
        const partialMatch = cell.match(/(\d+)\s+Partial/i);
        if (partialMatch) {
          statistics.availability.partial = parseInt(partialMatch[1]);
        }
        const snippetsMatch = cell.match(/(\d+)\s+Snippets/i);
        if (snippetsMatch) {
          statistics.availability.snippets = parseInt(snippetsMatch[1]);
        }
        const unavailableMatch = cell.match(/(\d+)\s+Unavailable/i);
        if (unavailableMatch) {
          statistics.availability.unavailable = parseInt(unavailableMatch[1]);
        }

        // Parse highlighted statistics
        const bestOfMatch = cell.match(/⭐\s+(\d+)\s+Best\s+Of/i);
        if (bestOfMatch) {
          statistics.highlighted.bestOf = parseInt(bestOfMatch[1]);
        }
        const specialMatch = cell.match(/✨\s+(\d+)\s+Special/i);
        if (specialMatch) {
          statistics.highlighted.special = parseInt(specialMatch[1]);
        }
        const wantedMatch = cell.match(/🥇\s+(\d+)\s+Wanted/i);
        if (wantedMatch) {
          statistics.highlighted.wanted = parseInt(wantedMatch[1]);
        }
      }
    }

    console.log('Parsed statistics:', statistics);
    return statistics;
  }

  /**
   * Parse album art from the Art tab of the Google Sheets
   */
  private static async parseAlbumArt(googleDocsUrl: string): Promise<Map<string, string>> {
    const artMap = new Map<string, string>();
    
    try {
      // Extract the document ID from the URL
      const docId = GoogleDocsParser.getDocumentId(googleDocsUrl);
      if (!docId) {
        console.log('Could not extract document ID for art parsing');
        return artMap;
      }
      
      // Try to get the Art tab - use known gid for Kanye tracker art sheet
      const artGids = ['1219860820', '1', '2', '3', '4', '5']; // Start with known art sheet gid
      
      for (const gid of artGids) {
        try {
          const artUrl = GoogleDocsParser.getJsonUrl(docId, gid);
          console.log(`Trying to fetch art from gid ${gid}:`, artUrl);
          
          const response = await axios.get(artUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          const jsonData = GoogleDocsParser.parseGoogleSheetsJson(response.data);
          
          // Type guard to handle the response structure
          let table: GoogleSheetsTable;
          if ('table' in jsonData && jsonData.table) {
            table = jsonData.table;
          } else if ('cols' in jsonData && 'rows' in jsonData) {
            table = jsonData as GoogleSheetsTable;
          } else {
            continue;
          }
          
          const rows = GoogleDocsParser.convertJsonToRows(table);
          if (rows.length === 0) {
            continue;
          }
          
          // Check if this sheet has art data by looking for "Era" and "Image" columns
          const firstRow = rows[0];
          const hasEraColumn = firstRow.some(cell => cell && cell.toLowerCase().includes('era'));
          const hasImageColumn = firstRow.some(cell => cell && cell.toLowerCase().includes('image'));
          
          if (!hasEraColumn || !hasImageColumn) {
            continue; // Not the art sheet
          }
          
          console.log(`Found art sheet at gid ${gid}`);
          
          // Find column indices
          let eraColumnIndex = -1;
          let imageColumnIndex = -1;
          
          for (let i = 0; i < firstRow.length; i++) {
            const cell = firstRow[i] || '';
            if (cell.toLowerCase().includes('era')) {
              eraColumnIndex = i;
            }
            if (cell.toLowerCase().includes('image')) {
              imageColumnIndex = i;
            }
          }
          
          // Parse art data
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            const eraName = eraColumnIndex >= 0 ? (row[eraColumnIndex] || '').trim() : '';
            const imageUrl = imageColumnIndex >= 0 ? (row[imageColumnIndex] || '').trim() : '';
            
            if (eraName && imageUrl && imageUrl.includes('http')) {
              // Clean up the era name similar to how we do in the main parser
              let cleanEraName = eraName;
              if (cleanEraName.includes('\n')) {
                cleanEraName = cleanEraName.split('\n')[0].trim();
              }
              cleanEraName = cleanEraName.replace(/\s*\([^)]*\)\s*$/, '').trim();
              
              console.log(`Found art for era "${cleanEraName}": ${imageUrl}`);
              artMap.set(cleanEraName, imageUrl);
            }
          }
          
          break; // Found the art sheet, stop trying other gids
          
        } catch (error) {
          console.log(`Gid ${gid} not accessible or not art sheet:`, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }
      }
      
    } catch (error) {
      console.error('Error parsing album art:', error);
    }
    
    return artMap;
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

  // Consolidate similar eras (only for specific cases like DONDA variants)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static consolidateEras(eras: any[]): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consolidatedEras = new Map<string, any>();
    
    for (const era of eras) {
      // Normalize the era name for comparison
      const normalizedName = era.name.trim();
      
      // Only consolidate specific known variants, not all year-suffixed eras
      let shouldConsolidate = false;
      let targetKey = normalizedName;
      
      // Special handling for Donda 2 variants only
      if (normalizedName.toLowerCase().includes('donda 2')) {
        shouldConsolidate = true;
        targetKey = 'Donda 2';
      }
      // Add other specific cases here if needed, but be very selective
      // DO NOT consolidate "Good Ass Job" variants as they are different projects
      
      if (shouldConsolidate) {
        if (consolidatedEras.has(targetKey)) {
          // Merge tracks into existing era
          const existingEra = consolidatedEras.get(targetKey)!;
          existingEra.tracks.push(...era.tracks);
          
          // Combine descriptions and notes
          if (era.description && !existingEra.description.includes(era.description)) {
            existingEra.description = existingEra.description 
              ? `${existingEra.description}\n${era.description}` 
              : era.description;
          }
          
          if (era.notes && !existingEra.notes.includes(era.notes)) {
            existingEra.notes = existingEra.notes 
              ? `${existingEra.notes}\n${era.notes}` 
              : era.notes;
          }
          
          // Combine alternate names
          if (era.alternateNames && era.alternateNames.length > 0) {
            existingEra.alternateNames = existingEra.alternateNames || [];
            for (const altName of era.alternateNames) {
              if (!existingEra.alternateNames.includes(altName)) {
                existingEra.alternateNames.push(altName);
              }
            }
          }
          
          // Use the first non-empty picture
          if (!existingEra.picture && era.picture) {
            existingEra.picture = era.picture;
          }
          
          console.log(`Consolidated "${era.name}" into "${targetKey}"`);
        } else {
          // Create new consolidated era with the target name
          consolidatedEras.set(targetKey, {
            ...era,
            name: targetKey
          });
        }
      } else {
        // Keep all other eras as-is, no consolidation
        consolidatedEras.set(era.name, era);
      }
    }
    
    return Array.from(consolidatedEras.values());
  }

  // Main parsing method with sheet selection using JSON API
  static async parseGoogleDoc(googleDocsUrl: string, sheetType: 'unreleased' | 'best' | 'recent' = 'unreleased'): Promise<Artist> {
    try {
      // Use the JSON API instead of CSV
      const jsonUrl = GoogleDocsParser.getJsonUrl(googleDocsUrl);
      console.log(`Using JSON API URL: ${jsonUrl}`);
      
      // Fetch JSON data
      const response = await axios.get(jsonUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrackerHub/1.0)',
        },
        timeout: 10000,
      });

      if (!response.data) {
        throw new Error('No data received from Google Sheets JSON API');
      }

      console.log('Received JSON response, parsing...');
      
      // Parse Google Sheets JSON response
      const jsonResponse = GoogleDocsParser.parseGoogleSheetsJson(response.data);
      
      // Type guard to handle the response structure
      let table: GoogleSheetsTable;
      if ('table' in jsonResponse && jsonResponse.table) {
        table = jsonResponse.table;
      } else if ('cols' in jsonResponse && 'rows' in jsonResponse) {
        table = jsonResponse as GoogleSheetsTable;
      } else {
        throw new Error('Invalid Google Sheets JSON structure');
      }
      
      // Convert to our internal JSON format
      const jsonData = GoogleDocsParser.parseJsonData(table, sheetType);
      
      console.log(`Parsed data: ${jsonData.eras.length} eras, ${jsonData.tracks.length} tracks`);
      
      // Consolidate similar eras (e.g., "Donda 2" and "Donda 2 (2025)")
      jsonData.eras = GoogleDocsParser.consolidateEras(jsonData.eras);
      console.log(`After consolidation: ${jsonData.eras.length} eras`);
      
      // Calculate actual track counts for validation
      const actualTrackCounts = {
        totalTracks: jsonData.tracks.length,
        eraTrackSum: jsonData.eras.reduce((sum: number, era) => sum + (era.tracks?.length || 0), 0)
      };
      console.log('Track count validation:', actualTrackCounts);
      
      // Validate statistics against actual counts
      const availability = jsonData.statistics.availability as { totalFull: number; unavailable: number };
      const statsSum = availability.totalFull + availability.unavailable;
      console.log(`Statistics sum (totalFull + unavailable): ${statsSum}, Actual tracks: ${actualTrackCounts.totalTracks}`);
      if (Math.abs(statsSum - actualTrackCounts.totalTracks) > 100) {
        console.warn(`⚠️  Large discrepancy in track counts: Stats=${statsSum}, Actual=${actualTrackCounts.totalTracks}`);
      }
      
      // Parse album art from the Art tab
      console.log('Fetching album art...');
      const artMap = await GoogleDocsParser.parseAlbumArt(googleDocsUrl);
      console.log(`Found art for ${artMap.size} albums`);
      
      // Convert to Artist format
      const albumMap = new Map<string, { tracks: Track[], picture?: string, description?: string, notes?: string, metadata?: EraMetadata }>();
      
      // Process eras and tracks
      for (const era of jsonData.eras) {
        if (!era.tracks || !Array.isArray(era.tracks)) {
          continue;
        }
        
        const tracks: Track[] = era.tracks.map((track: unknown, index: number) => {
          const trackData = track as Record<string, unknown>;
          const parsedTitle = GoogleDocsParser.parseTrackTitle(String(trackData.name || ''));
          
          return {
            id: `${era.name}-${trackData.name}-${index}`,
            era: era.name,
            title: parsedTitle,
            rawName: String(trackData.name || ''),
            notes: String(trackData.notes || ''),
            trackLength: String(trackData.trackLength || ''),
            fileDate: String(trackData.fileDate || ''),
            leakDate: String(trackData.leakDate || ''),
            availableLength: String(trackData.availableLength || ''),
            quality: String(trackData.quality || ''),
            links: Array.isArray(trackData.links) ? trackData.links.map((link: unknown) => {
              // Handle both old format (string) and new format (object with platform/type/isValid)
              if (typeof link === 'string') {
                return { url: link, type: 'audio' as const };
              } else if (typeof link === 'object' && link !== null && 'url' in link) {
                const linkObj = link as { url: string; platform?: string; type?: string; isValid?: boolean };
                const validTypes = ['unknown', 'download', 'stream', 'social', 'audio', 'web', 'video'];
                const linkType = linkObj.type && validTypes.includes(linkObj.type) ? 
                  linkObj.type as 'unknown' | 'download' | 'stream' | 'social' | 'audio' | 'web' | 'video' : 
                  'audio' as const;
                return {
                  url: linkObj.url,
                  type: linkType,
                  platform: linkObj.platform,
                  isValid: linkObj.isValid
                };
              }
              return { url: String(link), type: 'audio' as const };
            }) : [],
            isSpecial: Boolean(trackData.isSpecial),
            specialType: (['🏆', '✨', '⭐'].includes(String(trackData.specialType))) ? 
              String(trackData.specialType) as '🏆' | '✨' | '⭐' : 
              undefined
          };
        });
        
        albumMap.set(era.name, {
          tracks,
          picture: artMap.get(era.name) || era.picture || '',
          description: era.description,
          notes: era.notes,
          metadata: era.metadata as unknown as EraMetadata
        });
      }
      
      // Apply filtering based on sheet type
      if (sheetType !== 'unreleased') {
        console.log(`Applying filter for sheet type: ${sheetType}`);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filteredAlbumMap = new Map<string, { tracks: Track[], picture?: string, description?: string, notes?: string, metadata?: any }>();
        
        for (const [eraName, eraData] of albumMap.entries()) {
          const filteredTracks = eraData.tracks.filter(track => {
            switch (sheetType) {
              case 'best':
                return track.isSpecial;
              case 'recent':
                // Consider tracks recent if they have a leak date or file date within the last 6 months
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                
                // Check leak date
                if (track.leakDate) {
                  const leakDate = this.parseTrackDate(track.leakDate);
                  if (leakDate && leakDate >= sixMonthsAgo) {
                    return true;
                  }
                }
                
                // Check file date
                if (track.fileDate) {
                  const fileDate = this.parseTrackDate(track.fileDate);
                  if (fileDate && fileDate >= sixMonthsAgo) {
                    return true;
                  }
                }
                
                return false;
              default:
                return true;
            }
          });
          
          if (filteredTracks.length > 0) {
            // Sort special tracks by priority: ⭐ > ✨ > 🏆
            const sortedFilteredTracks = filteredTracks.sort((a, b) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const getPriority = (track: any) => {
                if (track.specialType === '⭐') return 3;
                if (track.specialType === '✨') return 2;
                if (track.specialType === '🏆') return 1;
                return 0;
              };
              
              const aPriority = getPriority(a);
              const bPriority = getPriority(b);
              
              if (aPriority !== bPriority) {
                return bPriority - aPriority; // Higher priority first
              }
              
              // If same priority, sort alphabetically
              return (a.title?.main || a.rawName || '').localeCompare(b.title?.main || b.rawName || '');
            });
            
            filteredAlbumMap.set(eraName, {
              ...eraData,
              tracks: sortedFilteredTracks
            });
          }
        }
        
        // Replace the original albumMap with filtered one
        albumMap.clear();
        for (const [key, value] of filteredAlbumMap.entries()) {
          albumMap.set(key, value);
        }
      }

      // Convert map to albums array, filtering out empty albums unless they have important metadata
      const albums: Album[] = Array.from(albumMap.entries())
        .filter(([albumName, albumData]) => {
          // Keep albums with tracks
          if (albumData.tracks.length > 0) {
            return true;
          }
          
          // Keep albums with important notes or metadata
          if (albumData.notes && albumData.notes.trim().length > 0) {
            return true;
          }
          
          // Keep albums with rich metadata
          if (albumData.metadata && Object.keys(albumData.metadata).length > 0) {
            return true;
          }
          
          // Otherwise, filter out empty albums
          console.log(`Filtering out empty album: ${albumName}`);
          return false;
        })
        .map(([albumName, albumData], index) => ({
          id: `album-${index}`,
          name: albumName,
          picture: albumData.picture || '',
          description: albumData.description || `${albumData.tracks.length} track${albumData.tracks.length !== 1 ? 's' : ''}`,
          tracks: albumData.tracks,
          metadata: albumData.metadata || {
            ogFiles: 0,
            fullFiles: 0,
            taggedFiles: 0,
            partialFiles: 0,
            snippetFiles: 0,
            stemBounceFiles: 0,
            unavailableFiles: 0
          },
          notes: albumData.notes || albumData.description || '',
          image: albumData.picture || undefined
        }));

      // Calculate filtered statistics if we're on a filtered sheet type
      let finalStatistics = jsonData.statistics;
      if (sheetType === 'best') {
        // Calculate stats from the filtered tracks only
        const allFilteredTracks = albums.flatMap(album => album.tracks);
        
        const specialTracksCount = allFilteredTracks.filter(track => track.isSpecial).length;
        const bestOfCount = allFilteredTracks.filter(track => track.specialType === '⭐').length;
        const specialCount = allFilteredTracks.filter(track => track.specialType === '✨').length;
        const wantedCount = allFilteredTracks.filter(track => track.specialType === '🏆').length;
        
        // Update the highlighted statistics to reflect only the filtered tracks
        finalStatistics = {
          ...jsonData.statistics,
          highlighted: {
            bestOf: bestOfCount,
            special: specialCount,
            wanted: wantedCount
          }
        };
        
        console.log(`Updated statistics for ${sheetType} sheet - Best Of: ${bestOfCount}, Special: ${specialCount}, Wanted: ${wantedCount}`);
      }

      return {
        name: jsonData.metadata.artistName || 'Unknown Artist',
        albums,
        updates: undefined, // We'll extract this from other parsing if needed
        statistics: finalStatistics as unknown as TrackerStatistics, // Use calculated statistics based on filtered data
        lastUpdated: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('Error parsing Google Doc with JSON API:', error);
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

  // Extract era information from Google Sheets column headers
  static extractEraInfoFromHeaders(cols: GoogleSheetsColumn[]): Map<string, { description?: string; timeline?: string }> {
    const eraInfo = new Map<string, { description?: string; timeline?: string }>();
    
    for (const col of cols) {
      const fullLabel = col.label || '';
      if (!fullLabel.trim()) continue;
      
      // Look for era names in the label
      const eraNames = this.extractEraNames(fullLabel);
      
      for (const eraName of eraNames) {
        if (!eraInfo.has(eraName)) {
          eraInfo.set(eraName, {});
        }
        
        const info = eraInfo.get(eraName)!;
        
        // Extract description (long text that looks like era description)
        const description = this.extractEraDescription(fullLabel, eraName);
        if (description && !info.description) {
          info.description = description;
        }
        
        // Extract timeline notes (parenthetical dates)
        const timeline = this.extractEraTimeline(fullLabel);
        if (timeline && !info.timeline) {
          info.timeline = timeline;
        }
      }
    }
    
    return eraInfo;
  }
  
  // Extract era names from column label text
  static extractEraNames(text: string): string[] {
    const eraNames: string[] = [];
    
    // Common era patterns - more comprehensive list
    const eraPatterns = [
      /Before The College Dropout/i,
      /The College Dropout/i,
      /Good Ass Job(?:\s*\(2018\))?/i,
      /Late Registration/i,
      /Graduation/i,
      /808s & Heartbreak/i,
      /My Beautiful Dark Twisted Fantasy/i,
      /Watch The Throne/i,
      /Cruel Summer/i,
      /Yeezus(?!\s)/i,
      /So Help Me God/i,
      /SWISH/i,
      /The Life Of Pablo/i,
      /TurboGrafx16/i,
      /LOVE EVERYONE/i,
      /ye(?!\s+tracker)/i,
      /KIDS SEE GHOSTS/i,
      /Yandhi/i,
      /JESUS IS KING/i,
      /God's Country/i,
      /Donda/i,
      /VULTURES/i,
      /BULLY/i,
      /CUCK/i,
      /IN A PERFECT WORLD/i,
      /WAR/i,
      /YEBU/i,
      /Bad Bitch Playbook/i
    ];
    
    for (const pattern of eraPatterns) {
      const match = text.match(pattern);
      if (match) {
        eraNames.push(match[0]);
      }
    }
    
    return eraNames;
  }
  
  // Extract era description from column label
  static extractEraDescription(text: string, eraName: string): string | undefined {
    // Look for long descriptive text that doesn't contain dates in parentheses
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // Skip lines that are just era names or column headers
      if (line.length < 50) continue;
      if (line.toLowerCase().includes('tracker')) continue;
      if (line.toLowerCase().includes('discord')) continue;
      if (line.match(/^\(.*\)$/)) continue; // Skip pure parenthetical content
      
      // Look for descriptive text about the era
      if (line.includes(eraName) || 
          line.toLowerCase().includes('kanye') || 
          line.toLowerCase().includes('album') ||
          line.toLowerCase().includes('project') ||
          line.toLowerCase().includes('released')) {
        return line.trim();
      }
    }
    
    return undefined;
  }
  
  // Extract timeline information from column label
  static extractEraTimeline(text: string): string | undefined {
    // Look for parenthetical date entries
    const timelineEntries: string[] = [];
    const datePattern = /\(\d{1,2}\/\d{1,2}\/\d{4}\)[^(]*/g;
    const dateMatches = text.match(datePattern);
    
    if (dateMatches) {
      timelineEntries.push(...dateMatches.map(match => match.trim()));
    }
    
    // Also look for month-day-year patterns
    const monthPattern = /\([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\)[^(]*/g;
    const monthMatches = text.match(monthPattern);
    
    if (monthMatches) {
      timelineEntries.push(...monthMatches.map(match => match.trim()));
    }
    
    if (timelineEntries.length > 0) {
      return timelineEntries.join('\n');
    }
    
    return undefined;
  }

}
