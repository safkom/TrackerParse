import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Track, Album, Artist } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const artistId = searchParams.get('artistId');
    
    if (!query || !artistId) {
      return NextResponse.json({ error: 'Missing query or artistId parameter' }, { status: 400 });
    }

    // Read cached data
    const cacheDir = path.join(process.cwd(), 'cache');
    const cacheFile = path.join(cacheDir, 'parsed-docs.json');
    
    if (!fs.existsSync(cacheFile)) {
      return NextResponse.json({ error: 'No cached data found' }, { status: 404 });
    }

    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const artist = cachedData.artists?.find((a: Artist & { id?: string }) => a.name === artistId || (a as unknown as { id?: string }).id === artistId);
    
    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Perform search
    const searchQuery = query.toLowerCase();
    const filteredAlbums = artist.albums.map((album: Album) => {
      const filteredTracks = album.tracks.filter((track: Track) => {
        if (!track || (!track.title?.main && !track.rawName)) {
          return false;
        }

        const titleMatch = track.title?.main?.toLowerCase().includes(searchQuery) || false;
        const alternateNamesMatch = track.title?.alternateNames?.some((name: string) =>
          name?.toLowerCase().includes(searchQuery)
        ) || false;

        return titleMatch || alternateNamesMatch;
      });

      // Return album only if it has matching tracks
      if (filteredTracks.length > 0) {
        return {
          ...album,
          tracks: filteredTracks
        };
      }

      return null;
    }).filter((album: Album | null) => album !== null);

    const totalTracks = filteredAlbums.reduce((total: number, album: Album) => total + album.tracks.length, 0);

    return NextResponse.json({
      albums: filteredAlbums,
      totalAlbums: filteredAlbums.length,
      totalTracks,
      query: searchQuery
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
