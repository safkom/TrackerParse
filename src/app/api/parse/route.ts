import { NextRequest, NextResponse } from 'next/server';
import { UnifiedParser } from '@/utils/unifiedParser';
import { ParsedSpreadsheetData } from '@/types';
import { logger, generateRequestId } from '@/utils/logger';

export const POST = async (request: NextRequest) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    logger.apiRequest('POST', '/api/parse', requestId);

    const body = await request.json();
    const { googleDocsUrl, jsonData } = body;
    
    logger.debug('Request body parsed', { hasGoogleDocsUrl: !!googleDocsUrl, hasJsonData: !!jsonData }, { requestId });

    if (!googleDocsUrl && !jsonData) {
      logger.warn('Missing required parameters', { body }, { requestId });
      return NextResponse.json(
        { error: 'Google Docs URL or JSON data is required' },
        { 
          status: 400,
          headers: { 'X-Request-ID': requestId }
        }
      );
    }

    let docId: string;
    if (googleDocsUrl) {
      try {
        docId = UnifiedParser.getDocumentId(googleDocsUrl);
        logger.parseStart(docId, requestId);
        logger.debug('Document ID extracted', { docId, url: googleDocsUrl }, { requestId });
      } catch {
        const duration = Date.now() - startTime;
        logger.parseError('unknown', new Error('Invalid Google Docs URL format'), duration, requestId);
        return NextResponse.json(
          { error: 'Invalid Google Docs URL format' },
          { 
            status: 400,
            headers: { 'X-Request-ID': requestId }
          }
        );
      }
    } else {
      // Generate a temporary ID for JSON data
      docId = `json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.debug('Generated temporary doc ID for JSON data', { docId }, { requestId });
    }

    // Parse the Google Doc - try unified parser first, fallback to API
    logger.info('Starting document parsing', { docId, hasJsonData: !!jsonData }, { requestId });
    
    try {
      if (jsonData) {
        logger.warn('JSON data parsing not yet implemented', {}, { requestId });
        return NextResponse.json(
          { error: 'JSON data parsing not yet implemented in unified parser' },
          { 
            status: 501,
            headers: { 'X-Request-ID': requestId }
          }
        );
      }
      
      const parseStartTime = Date.now();
      const artist = await UnifiedParser.parseGoogleDoc(googleDocsUrl || '');
      const parseDuration = Date.now() - parseStartTime;
      
      const stats = {
        artistName: artist.name,
        albumCount: artist.albums.length,
        totalTracks: artist.albums.reduce((sum, album) => sum + album.tracks.length, 0)
      };
      
      logger.parseSuccess(docId, stats, parseDuration, requestId);

      const response: ParsedSpreadsheetData & { id: string } = {
        artist,
        hasUpdatesPage: false, // Default values since config not available
        hasStatisticsPage: false,
        id: docId,
      };
      
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/parse', 200, duration, requestId, stats);
      
      return NextResponse.json(response, {
        headers: { 'X-Request-ID': requestId }
      });
    } catch (parseError) {
      const parseDuration = Date.now() - startTime;
      const error = parseError as Error;
      
      logger.parseError(docId, error, parseDuration, requestId);
      
      const errorMessage = error.message || 'Failed to parse Google Doc';
      const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                          errorMessage.toLowerCase().includes('rate limit') ||
                          errorMessage.toLowerCase().includes('too many requests');
      
      // If it's a quota error, provide helpful message
      if (isQuotaError) {
        logger.apiResponse('POST', '/api/parse', 429, parseDuration, requestId, { error: 'quota_exceeded' });
        return NextResponse.json(
          { 
            error: 'Google Sheets quota exceeded. Please try again in a few minutes or contact the tracker owner to reduce API usage.'
          },
          { 
            status: 429,
            headers: { 'X-Request-ID': requestId }
          }
        );
      }

      logger.apiResponse('POST', '/api/parse', 500, parseDuration, requestId, { error: errorMessage });
      return NextResponse.json(
        { 
          error: errorMessage
        },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiError('POST', '/api/parse', error as Error, requestId);
    logger.apiResponse('POST', '/api/parse', 500, duration, requestId, { error: 'internal_server_error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    );
  }
};

export const GET = async (request: NextRequest) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    logger.apiRequest('GET', '/api/parse', requestId);

    const url = new URL(request.url);
    const googleDocsUrl = url.searchParams.get('googleDocsUrl');
    const docId = url.searchParams.get('docId');

    logger.debug('Query parameters parsed', { hasGoogleDocsUrl: !!googleDocsUrl, hasDocId: !!docId }, { requestId });

    // Support both old docId format and new googleDocsUrl format
    let fullGoogleDocsUrl = '';
    
    if (googleDocsUrl) {
      fullGoogleDocsUrl = googleDocsUrl;
    } else if (docId) {
      // Reconstruct Google Docs URL from docId for backward compatibility
      const [baseDocId, gidPart] = docId.split('_gid_');
      if (gidPart) {
        fullGoogleDocsUrl = `https://docs.google.com/spreadsheets/d/${baseDocId}/edit?gid=${gidPart}`;
      } else {
        fullGoogleDocsUrl = `https://docs.google.com/spreadsheets/d/${docId}/edit`;
      }
      logger.debug('Reconstructed URL from docId', { docId, reconstructedUrl: fullGoogleDocsUrl }, { requestId });
    } else {
      logger.warn('Missing required parameters', {}, { requestId });
      return NextResponse.json(
        { error: 'Google Docs URL or Document ID is required' },
        { 
          status: 400,
          headers: { 'X-Request-ID': requestId }
        }
      );
    }

    try {
      logger.info('Starting document parsing', { url: fullGoogleDocsUrl }, { requestId });
      
      const parseStartTime = Date.now();
      const artist = await UnifiedParser.parseGoogleDoc(fullGoogleDocsUrl);
      const parseDuration = Date.now() - parseStartTime;
      
      const documentId = UnifiedParser.getDocumentId(fullGoogleDocsUrl);

      const stats = {
        documentId,
        artistName: artist.name,
        albumCount: artist.albums.length,
        totalTracks: artist.albums.reduce((sum, album) => sum + album.tracks.length, 0)
      };

      logger.parseSuccess(documentId, stats, parseDuration, requestId);

      const response: ParsedSpreadsheetData & { id: string } = {
        artist,
        hasUpdatesPage: false,
        hasStatisticsPage: false,
        id: documentId,
      };

      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/parse', 200, duration, requestId, stats);

      return NextResponse.json(response, {
        headers: { 'X-Request-ID': requestId }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.apiError('GET', '/api/parse', error as Error, requestId, { url: fullGoogleDocsUrl });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse Google Doc';
      logger.apiResponse('GET', '/api/parse', 500, duration, requestId, { error: errorMessage });
      return NextResponse.json(
        { error: errorMessage },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiError('GET', '/api/parse', error as Error, requestId);
    logger.apiResponse('GET', '/api/parse', 500, duration, requestId, { error: 'internal_server_error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    );
  }
};
