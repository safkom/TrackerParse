import { NextRequest, NextResponse } from 'next/server';
import { UnifiedParser } from '@/utils/unifiedParser';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const googleDocsUrl = searchParams.get('googleDocsUrl');

  if (!googleDocsUrl) {
    return NextResponse.json({ error: 'googleDocsUrl parameter is required' }, { status: 400 });
  }

  try {
    // Always fetch fresh data - no caching
    console.log('Fetching fresh data for debug');
    const artist = await UnifiedParser.parseGoogleDoc(googleDocsUrl);
    const docId = UnifiedParser.getDocumentId(googleDocsUrl);

    return NextResponse.json({
      status: 'fresh_data',
      message: 'Fresh data retrieved successfully',
      data: {
        name: artist.name,
        description: artist.description,
        albumCount: artist.albums.length,
        totalTracks: artist.albums.reduce((sum: number, album: { tracks: unknown[] }) => sum + album.tracks.length, 0)
      },
      lastUpdated: new Date().toISOString(),
      docId
    });
  } catch (error) {
    console.error('Debug API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
    return NextResponse.json({ 
      status: 'error',
      message: errorMessage 
    }, { status: 500 });
  }
}
