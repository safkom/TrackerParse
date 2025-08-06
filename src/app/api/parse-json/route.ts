import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { jsonData, trackerName } = await request.json();

    if (!jsonData) {
      return NextResponse.json({ error: 'JSON data is required' }, { status: 400 });
    }

    // JSON parsing is not yet implemented in the unified parser
    console.log('JSON parsing request received but not implemented');
    
    return NextResponse.json({ 
      error: 'JSON data parsing is not yet implemented. Please use Google Sheets URLs instead.' 
    }, { status: 501 });

  } catch (error) {
    console.error('JSON Parse API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
