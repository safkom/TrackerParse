import axios from 'axios';
import Papa from 'papaparse';
import { Artist, Album, Track, TrackTitle, TrackLink, EraMetadata, TrackerConfig } from '@/types';

export class ImprovedParser {
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  
  private static defaultConfig: TrackerConfig = {
    name: '',
    hasUpdatesPage: false,
    hasStatisticsPage: false,
    columnMappings: {
      era: ['era', 'album', 'project', 'section'],
      name: ['name', 'title', 'track', 'song', 'track name'],
      notes: ['notes', 'note', 'description', 'desc', 'info'],
      trackLength: ['track length', 'length', 'duration', 'time'],
      fileDate: ['file date', 'date recorded', 'recording date', 'created', 'date'],
      leakDate: ['leak date', 'leaked', 'release date', 'released'],
      availableLength: ['available length', 'available', 'snippet length'],
      quality: ['quality', 'bitrate', 'format'],
      links: ['link', 'links', 'url', 'download', 'stream', 'soundcloud', 'youtube']
    },
    eraPatterns: [
      'era', 'album', 'project', 'tape', 'ep', 'mixtape', 'compilation', 'before', 'after'
    ],
    footerPatterns: [
      'update', 'statistic', 'total', 'count', 'last updated', 'credits'
    ]
  };

  // Convert Google Docs URL to CSV export URL with gid support
  static getCSVUrl(googleDocsUrl: string): string {
    let docId = '';
    let gid = '0';
    
    if (googleDocsUrl.includes('/d/')) {
      const match = googleDocsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) docId = match[1];
    } else if (googleDocsUrl.includes('id=')) {
      const match = googleDocsUrl.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) docId = match[1];
    }

    const gidMatch = googleDocsUrl.match(/[?&#]gid=([0-9]+)/);
    if (gidMatch) gid = gidMatch[1];
    
    if (!docId) throw new Error('Invalid Google Docs URL format');
    
    let csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
    if (gid && gid !== '0') csvUrl += `&gid=${gid}`;
    
    return csvUrl;
  }

  // Get document ID for caching
  static getDocumentId(googleDocsUrl: string): string {
    let docId = '';
    
    if (googleDocsUrl.includes('/d/')) {
      const match = googleDocsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) docId = match[1];
    } else if (googleDocsUrl.includes('id=')) {
      const match = googleDocsUrl.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) docId = match[1];
    }
    
    const gidMatch = googleDocsUrl.match(/[?&#]gid=([0-9]+)/);
    if (gidMatch) docId += `_gid_${gidMatch[1]}`;
    
    if (!docId) throw new Error('Invalid Google Docs URL format');
    return docId;
  }

  // Find column index by pattern matching
  static findColumnIndex(headers: string[], patterns: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (patterns.some(pattern => header.includes(pattern.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  }

  // Parse era metadata from stats string
  static parseEraMetadata(statsText: string): EraMetadata {
    const metadata: EraMetadata = {
      ogFiles: 0,
      fullFiles: 0,
      taggedFiles: 0,
      partialFiles: 0,
      snippetFiles: 0,
      stemBounceFiles: 0,
      unavailableFiles: 0
    };

    const lines = statsText.split('\n');
    for (const line of lines) {
      const ogMatch = line.match(/(\d+)\s*OG\s*File/i);
      if (ogMatch) metadata.ogFiles = parseInt(ogMatch[1]);

      const fullMatch = line.match(/(\d+)\s*Full/i);
      if (fullMatch) metadata.fullFiles = parseInt(fullMatch[1]);

      const taggedMatch = line.match(/(\d+)\s*Tagged/i);
      if (taggedMatch) metadata.taggedFiles = parseInt(taggedMatch[1]);

      const partialMatch = line.match(/(\d+)\s*Partial/i);
      if (partialMatch) metadata.partialFiles = parseInt(partialMatch[1]);

      const snippetMatch = line.match(/(\d+)\s*Snippet/i);
      if (snippetMatch) metadata.snippetFiles = parseInt(snippetMatch[1]);

      const stemMatch = line.match(/(\d+)\s*Stem\s*Bounce/i);
      if (stemMatch) metadata.stemBounceFiles = parseInt(stemMatch[1]);

      const unavailableMatch = line.match(/(\d+)\s*Unavailable/i);
      if (unavailableMatch) metadata.unavailableFiles = parseInt(unavailableMatch[1]);
    }

    return metadata;
  }

  // Parse track title and extract features, collaborators, etc.
  static parseTrackTitle(rawName: string): TrackTitle {
    let main = rawName.trim();
    const features: string[] = [];
    const collaborators: string[] = [];
    const producers: string[] = [];
    const alternateNames: string[] = [];

    // Extract features (feat. or ft.)
    const featMatch = main.match(/\(feat\.?\s+([^)]+)\)/gi);
    if (featMatch) {
      featMatch.forEach(match => {
        const featArtists = match.replace(/\(feat\.?\s+/gi, '').replace(/\)/g, '');
        features.push(...featArtists.split(/[,&]+/).map(a => a.trim()));
        main = main.replace(match, '').trim();
      });
    }

    // Extract collaborators (with)
    const withMatch = main.match(/\(with\s+([^)]+)\)/gi);
    if (withMatch) {
      withMatch.forEach(match => {
        const withArtists = match.replace(/\(with\s+/gi, '').replace(/\)/g, '');
        collaborators.push(...withArtists.split(/[,&]+/).map(a => a.trim()));
        main = main.replace(match, '').trim();
      });
    }

    // Extract producers (prod.)
    const prodMatch = main.match(/\(prod\.?\s+([^)]+)\)/gi);
    if (prodMatch) {
      prodMatch.forEach(match => {
        const prodArtists = match.replace(/\(prod\.?\s+/gi, '').replace(/\)/g, '');
        producers.push(...prodArtists.split(/[,&]+/).map(a => a.trim()));
        main = main.replace(match, '').trim();
      });
    }

    return {
      main: main.trim(),
      isUnknown: main.includes('???'),
      features,
      collaborators,
      producers,
      references: [], // Add missing references property
      alternateNames
    };
  }

  // Parse track links from string
  static parseTrackLinks(linksText: string): TrackLink[] {
    if (!linksText) return [];

    const urls = linksText.split(/[,\n]/).map(url => url.trim()).filter(url => url);
    
    return urls.map(url => {
      let type: 'audio' | 'video' | 'download' | 'stream' = 'stream';
      let label = '';

      if (url.includes('soundcloud.com')) {
        type = 'audio';
        label = 'SoundCloud';
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        type = 'video';
        label = 'YouTube';
      } else if (url.includes('spotify.com')) {
        type = 'stream';
        label = 'Spotify';
      } else if (url.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        type = 'audio';
        label = 'Direct Audio';
      } else {
        label = 'Link';
      }

      return { url, label, type };
    });
  }

  // Extract Discord link from notes
  static extractDiscordLink(notes: string): string | undefined {
    const discordMatch = notes.match(/https?:\/\/discord\.gg\/[a-zA-Z0-9]+/);
    return discordMatch ? discordMatch[0] : undefined;
  }

  // Get document title from Google Sheets API
  static async getDocumentTitle(googleDocsUrl: string): Promise<string> {
    try {
      const docId = this.getDocumentId(googleDocsUrl).split('_gid_')[0]; // Remove gid suffix for title fetch
      
      // Try multiple approaches to get the document title
      
      // Approach 1: Try the feeds API (often works without authentication)
      try {
        const feedUrl = `https://spreadsheets.google.com/feeds/worksheets/${docId}/public/basic?alt=json`;
        const feedResponse = await axios.get(feedUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; TrackerHub/1.0)',
          },
          timeout: 10000,
        });
        
        if (feedResponse.data?.feed?.title?.$t) {
          const title = feedResponse.data.feed.title.$t.trim();
          if (title && title !== 'Worksheet') {
            console.log('Extracted document title from feeds API:', title);
            return title;
          }
        }
      } catch (feedError) {
        console.log('Feeds API failed, trying HTML approach:', feedError instanceof Error ? feedError.message : String(feedError));
      }
      
      // Approach 2: Try to get title from the HTML page
      const metadataUrl = `https://docs.google.com/spreadsheets/d/${docId}/edit`;
      
      const response = await axios.get(metadataUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      // Extract title from the HTML response using multiple patterns
      const htmlContent = response.data;
      
      // Pattern 1: Standard title tag
      const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        let title = titleMatch[1].trim();
        // Remove " - Google Sheets" suffix if present
        title = title.replace(/\s*-\s*Google\s*Sheets?\s*$/i, '');
        if (title && title !== 'Google Sheets' && !title.includes('Sign in')) {
          console.log('Extracted document title from HTML title tag:', title);
          return title;
        }
      }
      
      // Pattern 2: Look for document title in JavaScript variables
      const jsPattern = /"title":"([^"]+)"/;
      const jsMatch = htmlContent.match(jsPattern);
      if (jsMatch && jsMatch[1]) {
        const title = jsMatch[1].trim();
        if (title && title !== 'Untitled spreadsheet') {
          console.log('Extracted document title from JS variables:', title);
          return title;
        }
      }
      
      // Pattern 3: Look for og:title meta tag
      const ogTitleMatch = htmlContent.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        let title = ogTitleMatch[1].trim();
        title = title.replace(/\s*-\s*Google\s*Sheets?\s*$/i, '');
        if (title && title !== 'Google Sheets') {
          console.log('Extracted document title from og:title:', title);
          return title;
        }
      }
      
    } catch (error) {
      console.log('Could not fetch document title:', error instanceof Error ? error.message : String(error));
    }
    
    return 'Music Tracker'; // Fallback
  }

  // Main parsing method
  static async parseGoogleDoc(googleDocsUrl: string): Promise<Artist> {
    try {
      // Rate limiting: ensure minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(`Rate limiting: waiting ${waitTime}ms before request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.lastRequestTime = Date.now();
      
      const csvUrl = this.getCSVUrl(googleDocsUrl);
      
      const response = await axios.get(csvUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (compatible; TrackerHub/1.0)',
          'Accept': 'text/csv,application/csv,text/plain,*/*'
        },
        timeout: 30000,
        maxRedirects: 5,
        // Add retry logic for rate limiting
        validateStatus: (status) => {
          return status < 500; // Resolve only if status is less than 500
        }
      });

      // Handle specific error status codes
      if (response.status === 429) {
        throw new Error('The quota has been exceeded. Please try again in a few minutes.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Please ensure the Google Sheet is publicly accessible and shared with "Anyone with the link can view".');
      }

      if (response.status === 404) {
        throw new Error('Google Sheet not found. Please check the URL.');
      }

      if (response.status >= 400) {
        throw new Error(`Failed to fetch data (Status: ${response.status}). Please try again later.`);
      }

      const results = Papa.parse(response.data, {
        skipEmptyLines: false,
        header: false
      });

      const rows = results.data as string[][];
      if (rows.length === 0) throw new Error('No data found in the spreadsheet');

      // Find header row
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const row = rows[i];
        const hasEra = row.some(cell => cell && cell.toLowerCase().includes('era'));
        const hasName = row.some(cell => cell && (
          cell.toLowerCase().includes('name') || 
          cell.toLowerCase().includes('track') ||
          cell.toLowerCase().includes('song')
        ));
        
        if (hasEra && hasName) {
          headerRowIndex = i;
          headers = row.map(cell => cell ? cell.split('\n')[0].replace(/\([^)]*\)/g, '').trim() : '');
          break;
        }
      }

      if (headerRowIndex === -1) throw new Error('Could not find header row in spreadsheet');

      // Build column map
      const columnMap: Record<string, number> = {};
      Object.keys(this.defaultConfig.columnMappings).forEach(field => {
        const patterns = this.defaultConfig.columnMappings[field];
        columnMap[field] = this.findColumnIndex(headers, patterns);
      });

      // Extract tracker name - try to get document title first
      let trackerName = await this.getDocumentTitle(googleDocsUrl);
      
      // If we couldn't get the document title, look in early rows for tracker title
      if (trackerName === 'Music Tracker') {
        // First, try to find tracker name in the first few rows
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i];
          for (const cell of row) {
            if (cell && typeof cell === 'string') {
              const cellText = cell.trim();
              // Look for patterns that indicate tracker names
              const lower = cellText.toLowerCase();
              if (
                (lower.includes('tracker') || lower.includes('kanye') || lower.includes('ye ') || lower.includes('west')) &&
                !cellText.includes('http') &&
                !cellText.includes('Check Out') &&
                !cellText.includes('website') &&
                cellText.length < 100 &&
                // Avoid Discord/server/invite messages
                !lower.includes('discord') &&
                !lower.includes('server') &&
                !lower.includes('invite') &&
                !lower.includes('stay updated') &&
                !lower.includes('new links')
              ) {
                trackerName = cellText.split('\n')[0].trim();
                console.log('Found tracker name in early rows:', trackerName);
                break;
              }
            }
          }
          if (trackerName !== 'Music Tracker') break;
        }
        
        // Fallback: try to extract from header names
        if (trackerName === 'Music Tracker') {
          const nameHeaders = headers.filter(h => h && h.toLowerCase().includes('name'));
          if (nameHeaders.length > 0) {
            const nameHeader = nameHeaders[0];
            const lines = nameHeader.split('\n');
            if (lines.length > 0 && !lines[0].includes('(Check Out The Tracker Website')) {
              const headerName = lines[0].trim();
              if (headerName !== 'Name' && headerName !== 'Track Name') {
                trackerName = headerName;
              }
            }
          }
        }
      }

      // Parse tracks and eras
      const albums: Map<string, Album> = new Map();
      const dataRows = rows.slice(headerRowIndex + 1);
      let currentEra = 'Unknown';

      for (const row of dataRows) {
        if (!row || row.every(cell => !cell || cell.trim() === '')) continue;

        const eraCell = columnMap['era'] >= 0 ? (row[columnMap['era']] || '').trim() : '';
        const nameCell = columnMap['name'] >= 0 ? (row[columnMap['name']] || '').trim() : '';

        // Skip info/discord rows
        const rowText = row.join(' ').toLowerCase();
        if (rowText.includes('discord') || rowText.includes('join') || rowText.includes('server')) {
          continue;
        }

        // Check for era definition (stats format)
        const hasStatsInEra = eraCell.includes('OG File') || eraCell.includes('Full') || 
                             eraCell.includes('Tagged') || eraCell.includes('Snippet');
        
        if (hasStatsInEra && nameCell) {
          const eraName = nameCell.split('\n')[0].trim();
          if (eraName && !eraName.includes('Check Out The Tracker Website')) {
            currentEra = eraName;
            
            // Parse the nameCell content which contains notes, image, and description
            const lines = nameCell.split('\n');
            let notes = '';
            let description = '';
            let image = '';
            
            // First line is the era name, skip it
            const contentLines = lines.slice(1);
            
            // Look for image URL (usually contains http and common image domains)
            let imageLineIndex = -1;
            for (let i = 0; i < contentLines.length; i++) {
              const line = contentLines[i].trim();
              if (line.includes('http') && (
                line.includes('imgur') || 
                line.includes('drive.google') || 
                line.includes('dropbox') || 
                line.includes('ibb.co') ||
                line.includes('postimg') ||
                line.includes('gyazo') ||
                line.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)
              )) {
                image = line;
                imageLineIndex = i;
                break;
              }
            }
            
            // Everything before the image line is notes (date entries)
            if (imageLineIndex > 0) {
              notes = contentLines.slice(0, imageLineIndex).join('\n').trim();
            } else if (imageLineIndex === -1) {
              // No image found, look for pattern to separate notes from description
              const notesEndIndex = contentLines.findIndex(line => 
                line.length > 100 && !line.match(/^\(\d{2}\/\d{2}\/\d{4}\)/)
              );
              if (notesEndIndex > 0) {
                notes = contentLines.slice(0, notesEndIndex).join('\n').trim();
                description = contentLines.slice(notesEndIndex).join('\n').trim();
              } else {
                // All content is description if no clear notes pattern
                description = contentLines.join('\n').trim();
              }
            }
            
            // Everything after the image line is description
            if (imageLineIndex >= 0 && imageLineIndex < contentLines.length - 1) {
              description = contentLines.slice(imageLineIndex + 1).join('\n').trim();
            }
            
            if (!albums.has(currentEra)) {
              albums.set(currentEra, {
                id: `era-${albums.size}`,
                name: currentEra,
                metadata: this.parseEraMetadata(eraCell),
                notes: notes,
                description: description,
                image: image,
                tracks: [],
                year: this.extractYear(notes || description)
              });
            }
            continue;
          }
        }

        // Check for traditional era format
        if (eraCell && eraCell !== currentEra && !hasStatsInEra) {
          const isEraRow = !nameCell || nameCell.includes('(') && nameCell.length > 30;
          if (isEraRow) {
            currentEra = eraCell;
            if (!albums.has(currentEra)) {
              albums.set(currentEra, {
                id: `era-${albums.size}`,
                name: currentEra,
                metadata: { ogFiles: 0, fullFiles: 0, taggedFiles: 0, partialFiles: 0, snippetFiles: 0, stemBounceFiles: 0, unavailableFiles: 0 },
                notes: nameCell || '',
                description: nameCell || '',
                image: '',
                tracks: [],
                year: this.extractYear(nameCell || '')
              });
            }
            continue;
          }
        }

        // Process track rows
        if (nameCell && nameCell !== currentEra) {
          // Skip era description rows
          const isEraDesc = nameCell.includes('(') && nameCell.length > 50 && 
                           (nameCell.includes('born') || nameCell.includes('signs'));
          if (isEraDesc) continue;

          // Update current era if era cell has track's era
          if (eraCell && !hasStatsInEra && eraCell !== currentEra) {
            const isTrackEra = eraCell.length < 100 && !eraCell.includes('feat');
            if (isTrackEra) {
              currentEra = eraCell;
              if (!albums.has(currentEra)) {
                albums.set(currentEra, {
                  id: `era-${albums.size}`,
                  name: currentEra,
                  metadata: { ogFiles: 0, fullFiles: 0, taggedFiles: 0, partialFiles: 0, snippetFiles: 0, stemBounceFiles: 0, unavailableFiles: 0 },
                  notes: '',
                  description: '',
                  image: '',
                  tracks: [],
                });
              }
            }
          }

          // Ensure we have a current era
          if (!albums.has(currentEra)) {
            albums.set(currentEra, {
              id: `era-${albums.size}`,
              name: currentEra,
              metadata: { ogFiles: 0, fullFiles: 0, taggedFiles: 0, partialFiles: 0, snippetFiles: 0, stemBounceFiles: 0, unavailableFiles: 0 },
              notes: '',
              description: '',
              image: '',
              tracks: [],
            });
          }

          // Create track
          const track: Track = {
            id: `${currentEra}-${albums.get(currentEra)!.tracks.length}`,
            era: currentEra,
            title: this.parseTrackTitle(nameCell),
            rawName: nameCell,
            notes: columnMap['notes'] >= 0 ? (row[columnMap['notes']] || '') : '',
            discordLink: this.extractDiscordLink(row.join(' ')),
            trackLength: columnMap['trackLength'] >= 0 ? (row[columnMap['trackLength']] || '') : '',
            fileDate: columnMap['fileDate'] >= 0 ? (row[columnMap['fileDate']] || '') : '',
            leakDate: columnMap['leakDate'] >= 0 ? (row[columnMap['leakDate']] || '') : '',
            availableLength: columnMap['availableLength'] >= 0 ? (row[columnMap['availableLength']] || '') : '',
            quality: columnMap['quality'] >= 0 ? (row[columnMap['quality']] || '') : '',
            links: this.parseTrackLinks(columnMap['links'] >= 0 ? (row[columnMap['links']] || '') : ''),
            isSpecial: nameCell.includes('🏆') || nameCell.includes('✨'),
            specialType: nameCell.includes('🏆') ? '🏆' : nameCell.includes('✨') ? '✨' : undefined
          };

          albums.get(currentEra)!.tracks.push(track);
        }
      }

      // Filter out eras that are actually footer content (updates, statistics, etc.)
      const musicEras = Array.from(albums.values()).filter(era => {
        // Keep eras that have tracks
        if (era.tracks.length > 0) return true;
        
        // Filter out common footer/update patterns
        const name = era.name.toLowerCase();
        const isFooterContent = (
          name.includes('update') ||
          name.includes('added') ||
          name.includes('removed') ||
          name.includes('renamed') ||
          name.includes('changed') ||
          name.includes('made') ||
          name.includes('combined') ||
          name.includes('converted') ||
          name.includes('reformatted') ||
          name.includes('separated') ||
          name.includes('split') ||
          name.includes('links') ||
          name.includes('total') ||
          name.includes('missing') ||
          name.includes('sources') ||
          name.includes('available') ||
          name.includes('should be') || // Catches "should be on this page"
          name.includes('no released') || // Catches "No released remixes"
          name.includes('all music video') || // Catches "All music video editions"
          name.includes('go in misc') || // Catches "go in Misc / Released"
          name.includes('released remixes') || // Additional catch for remix notes
          name.includes('music video editions') || // Additional catch
          name.match(/^\d+/) || // Starts with number (like "5453 Total Links")
          name.includes('section') ||
          name.includes('notes') ||
          name.includes('tracker') ||
          name.includes('website') ||
          name.includes('form') ||
          name.includes('responses') ||
          name.includes('apology') ||
          name.includes('banner') ||
          name.includes('colours') ||
          name.includes('contrast') ||
          era.name.includes('(') && era.name.includes('/') && era.name.includes(')') // Date patterns like "(13/04/2019)"
        );
        
        return !isFooterContent;
      });

      return {
        name: trackerName,
        description: `${musicEras.length} eras with ${musicEras.reduce((sum, era) => sum + era.tracks.length, 0)} tracks`,
        albums: musicEras,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error parsing Google Doc:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new Error('Access denied. The Google Doc may not be publicly accessible.');
        } else if (error.response?.status === 404) {
          throw new Error('Google Doc not found. Please check the URL.');
        } else if (error.response?.status === 429) {
          throw new Error('The quota has been exceeded. Please try again in a few minutes.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The Google Doc may be too large or the server is busy.');
        }
      }
      
      // Check for specific error messages that indicate quota issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('quota') || 
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('too many requests')) {
        throw new Error('The quota has been exceeded. Please try again in a few minutes.');
      }
      
      throw new Error(`Failed to parse Google Doc: ${errorMessage}`);
    }
  }

  static extractYear(text: string): number | undefined {
    const yearMatch = text.match(/\((\d{4})\)/);
    return yearMatch ? parseInt(yearMatch[1]) : undefined;
  }
}
