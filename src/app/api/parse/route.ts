import { NextRequest, NextResponse } from 'next/server';
import { GoogleDocsParser } from '@/utils/googleDocsParser';
import { CacheManager } from '@/utils/cacheManager';
import { SheetChecker } from '@/utils/sheetChecker';
import { ParsedSpreadsheetData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { googleDocsUrl, sheetType = 'unreleased' } = body;

    if (!googleDocsUrl) {
      return NextResponse.json(
        { error: 'Google Docs URL is required' },
        { status: 400 }
      );
    }

    let docId: string;
    try {
      docId = GoogleDocsParser.getDocumentId(googleDocsUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Google Docs URL format' },
        { status: 400 }
      );
    }

    // Check cache and determine if we need to update
    const cachedArtist = await CacheManager.getCachedData(docId);

    if (cachedArtist && CacheManager.isCacheFresh(cachedArtist)) {
      // Check if the sheet has been updated since our last cache
      const hasUpdated = await SheetChecker.hasSheetUpdated(googleDocsUrl, cachedArtist.cacheMetadata);
      
      if (!hasUpdated) {
        // Sheet hasn't been updated, use cached data
        console.log('Using cached data - sheet not updated');
        const response: ParsedSpreadsheetData & { id: string } = {
          artist: cachedArtist,
          hasUpdatesPage: cachedArtist.config?.hasUpdatesPage ?? true,
          hasStatisticsPage: cachedArtist.config?.hasStatisticsPage ?? true,
          id: docId,
        };
        return NextResponse.json(response);
      } else {
        console.log('Sheet has been updated, fetching new data');
      }
    } else if (cachedArtist) {
      console.log('Cache is stale, fetching new data');
    } else {
      console.log('No cache found, fetching data');
    }

    // Parse the Google Doc using adaptive parser
    try {
      const artist = await GoogleDocsParser.parseGoogleDoc(googleDocsUrl, sheetType);
      
      console.log('API: Parsed artist:', artist);

      // Cache the result
      await CacheManager.saveToCache(docId, artist, {
        fetchedAt: new Date().toISOString()
      });

      const response: ParsedSpreadsheetData & { id: string } = {
        artist,
        hasUpdatesPage: false, // Default values since config not available
        hasStatisticsPage: false,
        id: docId,
      };
      return NextResponse.json(response);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      // Check if this is a quota/rate limit error
      const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse Google Doc';
      const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                          errorMessage.toLowerCase().includes('rate limit') ||
                          errorMessage.toLowerCase().includes('too many requests');
      
      // If parsing fails, try to return cached data if available
      const cachedArtist = await CacheManager.getCachedData(docId);
      if (cachedArtist) {
        const response: ParsedSpreadsheetData & { id: string } = {
          artist: cachedArtist,
          error: isQuotaError ? 
            'Google Sheets quota exceeded. Using cached data.' : 
            'Used cached data due to parsing error',
          hasUpdatesPage: cachedArtist.config?.hasUpdatesPage ?? true,
          hasStatisticsPage: cachedArtist.config?.hasStatisticsPage ?? true,
          id: docId,
        };
        return NextResponse.json(response);
      }

      // If no cached data available and it's a quota error, provide helpful message
      if (isQuotaError) {
        return NextResponse.json(
          { 
            error: 'Google Sheets quota exceeded. Please try again in a few minutes or contact the tracker owner to reduce API usage.'
          },
          { status: 429 } // Too Many Requests
        );
      }

      return NextResponse.json(
        { 
          error: errorMessage
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const docId = url.searchParams.get('docId');
  const sheetType = url.searchParams.get('sheetType') as 'unreleased' | 'best' || 'unreleased';

  if (!docId) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    );
  }

  try {
    // If requesting a specific sheet type, we need to re-parse
    if (sheetType && sheetType !== 'unreleased') {
      try {
        // Reconstruct the Google Docs URL from docId
        const googleDocsUrl = `https://docs.google.com/spreadsheets/d/${docId}/edit`;
        
        console.log(`API: Re-parsing for sheet type: ${sheetType}`);
        const artist = await GoogleDocsParser.parseGoogleDoc(googleDocsUrl, sheetType);
        
        const response: ParsedSpreadsheetData & { id: string } = {
          artist,
          hasUpdatesPage: false,
          hasStatisticsPage: false,
          id: docId,
        };
        return NextResponse.json(response);
      } catch (parseError) {
        console.error('Parse error for filtered view:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse filtered view' },
          { status: 500 }
        );
      }
    }

    // For 'unreleased' or no sheet type, use cached data
    const cachedArtist = await CacheManager.getCachedData(docId);
    
    if (!cachedArtist) {
      return NextResponse.json(
        { error: 'No cached data found for this document' },
        { status: 404 }
      );
    }

    const response: ParsedSpreadsheetData = {
      artist: cachedArtist,
      hasUpdatesPage: cachedArtist.config?.hasUpdatesPage ?? true,
      hasStatisticsPage: cachedArtist.config?.hasStatisticsPage ?? true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
