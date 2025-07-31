import { NextRequest, NextResponse } from 'next/server';
import { DataExporter } from '@/utils/dataExporter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');
    const format = searchParams.get('format') as 'json' | 'csv' || 'json';
    const includeMetadata = searchParams.get('includeMetadata') !== 'false';

    if (!docId || !/^[a-zA-Z0-9_-]+$/.test(docId)) {
      return NextResponse.json(
        { error: 'docId parameter is required' },
        { status: 400 }
      );
    }

    // First, get the parsed data
    const parseResponse = await fetch(
      `${request.nextUrl.origin}/api/parse?docId=${docId}`,
      { headers: { 'User-Agent': 'TrackerHub-Export' } }
    );

    if (!parseResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch spreadsheet data' },
        { status: parseResponse.status }
      );
    }

    const parsedData = await parseResponse.json();
    
    if (!parsedData.artist) {
      return NextResponse.json(
        { error: 'No artist data found' },
        { status: 404 }
      );
    }

    const sourceUrl = `https://docs.google.com/spreadsheets/d/${docId}`;
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'json') {
      content = DataExporter.exportToJSON(parsedData.artist, docId, sourceUrl, {
        format: 'json',
        includeMetadata
      });
      contentType = 'application/json';
      filename = DataExporter.generateFilename(parsedData.artist.name, docId, 'json');
    } else {
      content = DataExporter.exportToCSV(parsedData.artist);
      contentType = 'text/csv';
      filename = DataExporter.generateFilename(parsedData.artist.name, docId, 'csv');
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docId, format = 'json', includeMetadata = true, artistData } = body;

    if (!docId || !/^[a-zA-Z0-9_-]+$/.test(docId) || !artistData) {
      return NextResponse.json(
        { error: 'docId and artistData are required' },
        { status: 400 }
      );
    }

    const sourceUrl = `https://docs.google.com/spreadsheets/d/${docId}`;
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'json') {
      content = DataExporter.exportToJSON(artistData, docId, sourceUrl, {
        format: 'json',
        includeMetadata
      });
      contentType = 'application/json';
      filename = DataExporter.generateFilename(artistData.name, docId, 'json');
    } else {
      content = DataExporter.exportToCSV(artistData);
      contentType = 'text/csv';
      filename = DataExporter.generateFilename(artistData.name, docId, 'csv');
    }

    return NextResponse.json({
      content,
      filename,
      contentType
    });

  } catch (error) {
    console.error('Export POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}
