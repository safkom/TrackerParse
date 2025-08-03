import { NextRequest, NextResponse } from 'next/server';
import { CacheManager } from '@/utils/cacheManager';

export async function POST(request: NextRequest) {
  try {
    const { action, docId } = await request.json();

    if (action === 'clear-all') {
      await CacheManager.clearAllCache();
      return NextResponse.json({ 
        success: true, 
        message: 'All cache cleared successfully' 
      });
    } else if (action === 'clear-doc' && docId) {
      await CacheManager.clearCache(docId);
      return NextResponse.json({ 
        success: true, 
        message: `Cache cleared for document: ${docId}` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action or missing docId' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to clear cache' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cache = await CacheManager.loadCache();
    const cacheKeys = Object.keys(cache);
    const cacheStats = cacheKeys.map(key => ({
      docId: key,
      lastUpdated: cache[key].lastUpdated,
      trackCount: cache[key].albums.reduce((acc, album) => acc + album.tracks.length, 0),
      cacheMetadata: cache[key].cacheMetadata
    }));

    return NextResponse.json({
      success: true,
      cacheCount: cacheKeys.length,
      cacheStats
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get cache stats' 
    }, { status: 500 });
  }
}
