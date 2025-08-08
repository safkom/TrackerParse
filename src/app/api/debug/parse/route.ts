import { NextRequest, NextResponse } from 'next/server';
import { UnifiedParser } from '@/utils/unifiedParser';

export async function POST(request: NextRequest) {
  try {
    const { googleDocsUrl, jsonData } = await request.json();

    if (!googleDocsUrl && !jsonData) {
      return NextResponse.json({ error: 'Google Docs URL or JSON data is required' }, { status: 400 });
    }

    console.log('🐛 Starting debug parsing...');

    // Use the unified parser with debug logging
    let result;
    try {
      if (googleDocsUrl) {
        result = await UnifiedParser.parseGoogleDoc(googleDocsUrl);
      } else {
        // For JSON data, return error for now
        return NextResponse.json({ error: 'JSON data parsing not yet implemented' }, { status: 501 });
      }
    } catch (error) {
      console.error('Debug parsing error:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        debugInfo: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error)
        }
      }, { status: 500 });
    }

    const debugInfo = {
      artist: result.name,
      albumCount: result.albums.length,
      totalTracks: result.albums.reduce((sum: number, album: { tracks: unknown[] }) => sum + album.tracks.length, 0),
      lastUpdated: result.lastUpdated
    };

    console.log('🐛 Debug parsing completed:', debugInfo);

    return NextResponse.json({
      success: true,
      result,
      debugInfo,
      debugLogs: [
        {
          step: 'PARSING_COMPLETE',
          message: 'Successfully parsed with UnifiedParser',
          data: debugInfo,
          timestamp: new Date().toISOString()
        }
      ]
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
