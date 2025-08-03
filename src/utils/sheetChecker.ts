import { CacheMetadata } from '@/types';

export class SheetChecker {
  // Convert Google Docs URL to CSV export URL
  static getCSVUrl(googleDocsUrl: string): string {
    // Extract the document ID from various Google Docs URL formats
    let docId = '';
    let gid = '';
    
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
    
    // Extract gid (sheet tab ID) if present
    const gidMatch = googleDocsUrl.match(/[?&#]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }
    
    if (!docId) {
      throw new Error('Could not extract document ID from Google Docs URL');
    }
    
    // Convert to CSV export URL with gid if present
    let csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
    if (gid) {
      csvUrl += `&gid=${gid}`;
    }
    
    return csvUrl;
  }

  /**
   * Check if a Google Sheet has been updated by fetching only headers
   * This is much more efficient than downloading the entire sheet
   */
  static async getSheetMetadata(googleDocsUrl: string): Promise<CacheMetadata> {
    try {
      // Convert Google Docs URL to CSV export URL
      const csvUrl = this.getCSVUrl(googleDocsUrl);
      
      // Make a HEAD request to get metadata without downloading content
      const response = await fetch(csvUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata: CacheMetadata = {
        lastModified: response.headers.get('last-modified') || undefined,
        etag: response.headers.get('etag') || undefined,
        contentLength: parseInt(response.headers.get('content-length') || '0') || undefined,
        fetchedAt: new Date().toISOString(),
      };

      return metadata;
    } catch (error) {
      console.error('Error getting sheet metadata:', error);
      // Return minimal metadata if we can't get headers
      return {
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if a sheet has been updated by comparing metadata
   * This is called before deciding whether to parse the full sheet
   */
  static async hasSheetUpdated(googleDocsUrl: string, cachedMetadata: CacheMetadata): Promise<boolean> {
    try {
      const newMetadata = await this.getSheetMetadata(googleDocsUrl);
      
      // Compare ETags (most reliable indicator)
      if (cachedMetadata.etag && newMetadata.etag) {
        return cachedMetadata.etag !== newMetadata.etag;
      }
      
      // Compare Last-Modified dates
      if (cachedMetadata.lastModified && newMetadata.lastModified) {
        return cachedMetadata.lastModified !== newMetadata.lastModified;
      }
      
      // Compare content length as a fallback
      if (cachedMetadata.contentLength && newMetadata.contentLength) {
        return cachedMetadata.contentLength !== newMetadata.contentLength;
      }
      
      // If we can't determine, assume it might have updated
      return true;
    } catch (error) {
      console.error('Error checking if sheet updated:', error);
      // If we can't check, assume it might have updated
      return true;
    }
  }
}
