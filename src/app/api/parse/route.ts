import { NextRequest, NextResponse } from 'next/server';
import { UnifiedParser } from '@/utils/unifiedParser';
import { ParsedSpreadsheetData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { googleDocsUrl, sheetType = 'unreleased', jsonData } = body;

    if (!googleDocsUrl && !jsonData) {
      return NextResponse.json(
        { error: 'Google Docs URL or JSON data is required' },
        { status: 400 }
      );
    }

    let docId: string;
    if (googleDocsUrl) {
      try {
        docId = UnifiedParser.getDocumentId(googleDocsUrl);
      } catch {
        return NextResponse.json(
          { error: 'Invalid Google Docs URL format' },
          { status: 400 }
        );
      }
    } else {
      // Generate a temporary ID for JSON data
      docId = `json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Parse the Google Doc using unified parser - always fetch fresh data
    console.log('Fetching fresh data from source');
    try {
      if (jsonData) {
        // TODO: Add JSON data parsing support to unified parser
        return NextResponse.json(
          { error: 'JSON data parsing not yet implemented in unified parser' },
          { status: 501 }
        );
      }
      
      const artist = await UnifiedParser.parseGoogleDoc(googleDocsUrl || '');
      
      console.log('API: Parsed artist:', artist);

      const response: ParsedSpreadsheetData & { id: string } = {
        artist,
        hasUpdatesPage: false, // Default values since config not available
        hasStatisticsPage: false,
        id: docId,
      };
      return NextResponse.json(response);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse Google Doc';
      const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                          errorMessage.toLowerCase().includes('rate limit') ||
                          errorMessage.toLowerCase().includes('too many requests');
      
      // If it's a quota error, provide helpful message
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
  const googleDocsUrl = url.searchParams.get('googleDocsUrl');
  const docId = url.searchParams.get('docId');
  const sheetType = url.searchParams.get('sheetType') as 'unreleased' | 'best' | 'recent' || 'unreleased';

  // Support both old docId format and new googleDocsUrl format
  let fullGoogleDocsUrl = '';
  
  if (googleDocsUrl) {
    fullGoogleDocsUrl = googleDocsUrl;
  } else if (docId) {
    // Reconstruct Google Docs URL from docId for backward compatibility
    const [baseDocId, gidPart] = docId.split('_gid_');
    if (gidPart) {
      fullGoogleDocsUrl = `https://docs.google.com/spreadsheets/d/${baseDocId}/edit?gid=${gidPart}`;
    } else {
      fullGoogleDocsUrl = `https://docs.google.com/spreadsheets/d/${docId}/edit`;
    }
  } else {
    return NextResponse.json(
      { error: 'Google Docs URL or Document ID is required' },
      { status: 400 }
    );
  }

  try {
    // Always fetch fresh data - no caching
    console.log('Fetching fresh data from source for:', fullGoogleDocsUrl);
    
    // Use unified parser for consistent data extraction
    const artist = await UnifiedParser.parseGoogleDoc(fullGoogleDocsUrl);
    const documentId = UnifiedParser.getDocumentId(fullGoogleDocsUrl);

    const response: ParsedSpreadsheetData & { id: string } = {
      artist,
      hasUpdatesPage: false,
      hasStatisticsPage: false,
      id: documentId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse Google Doc';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
