import { NextRequest, NextResponse } from 'next/server';
import { GoogleDocsParser } from '@/utils/googleDocsParser';
import { CacheManager } from '@/utils/cacheManager';
import { ParsedSpreadsheetData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { googleDocsUrl, forceRefresh = false } = body;

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

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedArtist = await CacheManager.getCachedData(docId);
      if (cachedArtist && CacheManager.isCacheFresh(cachedArtist)) {
        const response: ParsedSpreadsheetData = {
          artist: cachedArtist,
        };
        return NextResponse.json(response);
      }
    }

    // Parse the Google Doc
    try {
      const artist = await GoogleDocsParser.parseGoogleDoc(googleDocsUrl);
      
      // Cache the result
      await CacheManager.saveToCache(docId, artist);

      const response: ParsedSpreadsheetData = {
        artist,
      };

      return NextResponse.json(response);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      // If parsing fails, try to return cached data if available
      const cachedArtist = await CacheManager.getCachedData(docId);
      if (cachedArtist) {
        const response: ParsedSpreadsheetData = {
          artist: cachedArtist,
          error: 'Used cached data due to parsing error',
        };
        return NextResponse.json(response);
      }

      return NextResponse.json(
        { 
          error: parseError instanceof Error ? parseError.message : 'Failed to parse Google Doc'
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

  if (!docId) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    );
  }

  try {
    const cachedArtist = await CacheManager.getCachedData(docId);
    
    if (!cachedArtist) {
      return NextResponse.json(
        { error: 'No cached data found for this document' },
        { status: 404 }
      );
    }

    const response: ParsedSpreadsheetData = {
      artist: cachedArtist,
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
