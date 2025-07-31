import { NextResponse } from 'next/server';
import { CacheManager } from '@/utils/cacheManager';

export async function GET() {
  try {
    // Get the cached data
    const docId = '1T8qrrF1hpWJFkvPLhscvFEwl91oHcnVRRd9MxeNPFTU_gid_1514633639';
    const cachedData = await CacheManager.getCachedData(docId);
    
    if (cachedData) {
      return NextResponse.json({
        status: 'success',
        message: 'Cached data found',
        artist: {
          name: cachedData.name,
          description: cachedData.description,
          albumCount: cachedData.albums.length,
          totalTracks: cachedData.albums.reduce((sum, album) => sum + album.tracks.length, 0)
        },
        lastUpdated: cachedData.lastUpdated
      });
    } else {
      return NextResponse.json({
        status: 'no_cache',
        message: 'No cached data found'
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
