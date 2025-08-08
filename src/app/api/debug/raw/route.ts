import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsAPIParser } from '@/utils/googleSheetsAPI';

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

    console.log('Fetching raw data via Google Sheets API:', docId, 'GID:', gid);

    // Use Google Sheets API to get raw data
    const availableSheets = await GoogleSheetsAPIParser.getAvailableSheets(docId);
    console.log('🔍 Available sheets:', availableSheets);
    
    // Find target sheet by GID or use first sheet
    let targetSheet = availableSheets.find(sheet => sheet.gid === gid);
    if (!targetSheet && availableSheets.length > 0) {
      targetSheet = availableSheets[0];
    }
    
    const sheetName = targetSheet ? targetSheet.title : 'Sheet1';
    console.log(`📋 Using sheet: ${sheetName} (GID: ${targetSheet?.gid || gid})`);
    
    const rows = await GoogleSheetsAPIParser.getSheetDataViaAPI(docId, sheetName);
    console.log(`📋 Fetched ${rows.length} rows from Google Sheets API`);

    // Normalize and analyze the raw data
    const normalizedRows = rows.map(row => 
      row.map(cell => (cell || '').toString().normalize('NFC'))
    );
    
    // Find statistics rows near the end
    const statisticsRows = [];
    const startIndex = Math.max(0, normalizedRows.length - 100); // Last 100 rows
    for (let i = startIndex; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const firstCell = row[0] ? row[0].toLowerCase() : '';
      
      // Look for statistics patterns
      if (firstCell.includes('lossless') || firstCell.includes('cd quality') || 
          firstCell.includes('total links') || firstCell.includes('og files') ||
          (firstCell.includes('total') && firstCell.includes('full'))) {
        statisticsRows.push({
          rowIndex: i,
          row: row
        });
      }
    }

    const analysis = {
      totalRows: normalizedRows.length,
      nonEmptyRows: normalizedRows.filter(row => row.some(cell => cell && cell.trim())).length,
      firstFewRows: normalizedRows.slice(0, 15), // First 15 rows for inspection
      lastFewRows: normalizedRows.slice(-15), // Last 15 rows for statistics
      statisticsRows: statisticsRows,
      columnCount: Math.max(...normalizedRows.map(row => row.length)),
      sampleData: {
        row0: normalizedRows[0] || [],
        row1: normalizedRows[1] || [],
        row2: normalizedRows[2] || [],
        row3: normalizedRows[3] || [],
        row4: normalizedRows[4] || [],
        lastRow: normalizedRows[normalizedRows.length - 1] || [],
        secondLastRow: normalizedRows[normalizedRows.length - 2] || [],
      }
    };

    // Look for potential header rows
    const potentialHeaders = [];
    for (let i = 0; i < Math.min(15, normalizedRows.length); i++) {
      const row = normalizedRows[i];
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

    // Create comprehensive raw data with statistics
    const fullRawData = normalizedRows.map(row => row.join('\t')).join('\n');
    
    return NextResponse.json({
      success: true,
      url: googleDocsUrl,
      rawData: fullRawData, // Full raw data instead of truncated
      analysis,
      potentialHeaders,
      metadata: {
        docId,
        gid: targetSheet?.gid || gid,
        sheetName,
        totalSheets: availableSheets.length,
        availableSheets,
        dataRows: normalizedRows.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('Raw data fetch error:', error);
    
    let errorMessage = 'Failed to fetch raw data via Google Sheets API';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Google Sheets API key is not configured or invalid.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Google Sheets API quota exceeded.';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'Access denied. The Google Sheet may not be publicly accessible.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Google Sheet not found. Please check the URL.';
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
