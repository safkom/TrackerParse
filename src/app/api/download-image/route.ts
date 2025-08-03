import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  try {
    // Validate URL
    const url = new URL(imageUrl);
    const allowedDomains = [
      'drive.google.com',
      'docs.google.com',
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'images.unsplash.com',
      'unsplash.com',
      'i.imgur.com',
      'imgur.com',
      'cdn.discordapp.com',
      'media.discordapp.net'
    ];

    const isAllowed = allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return NextResponse.json({ error: 'Image domain not allowed' }, { status: 403 });
    }

    // For Google Drive images, convert to direct download link
    let fetchUrl = imageUrl;
    if (url.hostname.includes('drive.google.com') && imageUrl.includes('/file/d/')) {
      const fileIdMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'TrackerParse/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Verify it's an image
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Image download error:', error);
    return NextResponse.json(
      { error: 'Failed to download image' }, 
      { status: 500 }
    );
  }
}
