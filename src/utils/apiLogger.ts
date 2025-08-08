import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export interface LoggedApiHandler {
  (request: NextRequest): Promise<NextResponse>;
}

export function withLogging(
  handler: LoggedApiHandler,
  operationName?: string
): LoggedApiHandler {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = request.headers.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const method = request.method;
    const url = request.url;
    const pathname = new URL(url).pathname;
    
    // Log request start
    logger.apiRequest(method, pathname, requestId, {
      operationName,
      userAgent: request.headers.get('user-agent'),
      contentLength: request.headers.get('content-length'),
    });

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      
      // Log successful response
      logger.apiResponse(method, pathname, response.status, duration, requestId, {
        operationName,
        responseSize: response.headers.get('content-length'),
      });
      
      // Add request ID to response headers for tracking
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;
      
      // Log error
      logger.apiError(method, pathname, err, requestId, {
        operationName,
        duration,
      });
      
      // Return error response
      return NextResponse.json(
        { error: 'Internal Server Error', requestId },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      );
    }
  };
}

// Helper function to log specific operations within an API route
export function logOperation(operation: string, requestId: string) {
  return {
    start: (meta?: any) => {
      logger.info(`Starting ${operation}`, meta, { requestId });
    },
    success: (duration: number, meta?: any) => {
      logger.info(`${operation} completed successfully (${duration}ms)`, meta, { requestId });
    },
    error: (error: Error, duration: number, meta?: any) => {
      logger.error(`${operation} failed (${duration}ms): ${error.message}`, { error: error.stack, ...meta }, { requestId });
    },
    info: (message: string, meta?: any) => {
      logger.info(`${operation}: ${message}`, meta, { requestId });
    },
    warn: (message: string, meta?: any) => {
      logger.warn(`${operation}: ${message}`, meta, { requestId });
    },
    debug: (message: string, meta?: any) => {
      logger.debug(`${operation}: ${message}`, meta, { requestId });
    }
  };
}
