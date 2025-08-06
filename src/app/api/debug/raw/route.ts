import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import Papa from 'papaparse';

const USER_AGENT = 'Mozilla/5.0 (compatible; TrackerParse/1.0)';
const REQUEST_TIMEOUT = 30000;

export async function POST(request: NextRequest) {
  try {
    const { googleDocsUrl } = await request.json();

    if (!googleDocsUrl) {
      return NextResponse.json({ error: 'Google Docs URL is required' }, { status: 400 });
    }

    // Extract document ID and gid
    let docId = '';
    let gid = '0';
    
    if (googleDocsUrl.includes('/d/')) {
      const match = googleDocsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) docId = match[1];
    } else if (googleDocsUrl.includes('id=')) {
      const match = googleDocsUrl.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) docId = match[1];
    }

    const gidMatch = googleDocsUrl.match(/[?&#]gid=([0-9]+)/);
    if (gidMatch) gid = gidMatch[1];
    
    if (!docId) {
      return NextResponse.json({ error: 'Invalid Google Docs URL format' }, { status: 400 });
    }

    // Generate CSV URL
    let csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
    if (gid && gid !== '0') csvUrl += `&gid=${gid}`;

    console.log('Fetching raw CSV from:', csvUrl);

    // Fetch raw CSV data
    const response = await axios.get(csvUrl, {
      headers: { 
        'User-Agent': USER_AGENT,
        'Accept': 'text/csv,application/csv,text/plain,*/*'
      },
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 5,
    });

    // Parse CSV into rows
    const results = Papa.parse(response.data, {
      skipEmptyLines: false,
      header: false
    });

    const rows = results.data as string[][];
    
    // Analyze the raw data
    const analysis = {
      totalRows: rows.length,
      nonEmptyRows: rows.filter(row => row.some(cell => cell && cell.trim())).length,
      firstFewRows: rows.slice(0, 10), // First 10 rows for inspection
      columnCount: Math.max(...rows.map(row => row.length)),
      sampleData: {
        row0: rows[0] || [],
        row1: rows[1] || [],
        row2: rows[2] || [],
        row3: rows[3] || [],
        row4: rows[4] || [],
      }
    };

    // Look for potential header rows
    const potentialHeaders = [];
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i];
      const hasEra = row.some(cell => cell && cell.toLowerCase().includes('era'));
      const hasName = row.some(cell => cell && (
        cell.toLowerCase().includes('name') || 
        cell.toLowerCase().includes('track') ||
        cell.toLowerCase().includes('song') ||
        cell.toLowerCase().includes('title')
      ));
      
      if (hasEra || hasName) {
        potentialHeaders.push({
          rowIndex: i,
          row: row,
          hasEra,
          hasName,
          confidence: (hasEra ? 50 : 0) + (hasName ? 50 : 0)
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: csvUrl,
      rawData: response.data.substring(0, 5000) + (response.data.length > 5000 ? '\n... (truncated)' : ''),
      analysis,
      potentialHeaders,
      metadata: {
        docId,
        gid,
        contentLength: response.data.length,
        contentType: response.headers['content-type'],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('Raw data fetch error:', error);
    
    let errorMessage = 'Failed to fetch raw data';
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 403) {
        errorMessage = 'Access denied. The Google Sheet may not be publicly accessible.';
      } else if (axiosError.response?.status === 404) {
        errorMessage = 'Google Sheet not found. Please check the URL.';
      } else if (axiosError.response?.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
