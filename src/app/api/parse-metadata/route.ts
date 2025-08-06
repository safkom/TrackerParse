import { NextRequest, NextResponse } from 'next/server';
import { UnifiedParser } from '@/utils/unifiedParser';
import { reconstructGoogleSheetsUrl } from '@/utils/urlUtils';
import { Artist } from '@/types';

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
    // Handle both simple docId and docId with GID using utility function
    const fullGoogleDocsUrl = reconstructGoogleSheetsUrl(docId);
    
    console.log('🚀 Fetching metadata only for:', fullGoogleDocsUrl);
    
    // Try unified parser
    let artist: Artist;
    try {
      artist = await UnifiedParser.parseGoogleDoc(fullGoogleDocsUrl);
      console.log('✅ Unified parser succeeded');
    } catch (error) {
      console.log('⚠️ Unified parser failed:', error instanceof Error ? error.message : String(error));
      throw error; // Re-throw since we don't have fallback
    }
    
    console.log('📊 API: Parsed artist metadata:', {
      name: artist.name,
      description: artist.description,
      albumCount: artist.albums.length,
      totalTracks: artist.albums.reduce((sum: number, album) => sum + album.tracks.length, 0)
    });

    const response = {
      artist: {
        ...artist,
        albums: artist.albums.map(album => ({
          ...album,
          tracks: [], // Don't include tracks in metadata response
          metadata: {
            ...album.metadata,
            trackCount: album.tracks.length // Use actual track count from HTML parser
          }
        }))
      },
      hasUpdatesPage: false,
      hasStatisticsPage: false,
      id: docId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ API metadata error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse document metadata';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
