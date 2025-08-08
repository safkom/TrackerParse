import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
  userId?: string;
  endpoint?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logsDir: string;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    // Skip path setup on edge runtime
    if (typeof process !== 'undefined' && process.cwd) {
      this.logsDir = path.join(process.cwd(), 'logs');
      this.ensureLogsDirectory();
    } else {
      this.logsDir = '';
    }
  }

  private formatLogEntry(level: string, message: string, meta?: any, context?: { requestId?: string; userId?: string; endpoint?: string }): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      requestId: context?.requestId,
      userId: context?.userId,
      endpoint: context?.endpoint,
    };
  }

  private writeToFile(logEntry: LogEntry) {
    // Skip file writing on client side or edge runtime
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process.cwd) {
      return;
    }

    try {
      const logFile = this.getLogFileName();
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private getLogFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `app-${dateStr}.log`);
  }

  private ensureLogsDirectory() {
    // Skip directory creation on client side or edge runtime
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process.cwd) {
      return;
    }
    
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any, context?: { requestId?: string; userId?: string; endpoint?: string }) {
    if (level > this.logLevel) return;

    const logEntry = this.formatLogEntry(levelName, message, meta, context);
    
    // Always log to console
    const consoleMessage = `[${logEntry.timestamp}] ${levelName.padEnd(5)} - ${message}`;
    switch (level) {
      case LogLevel.ERROR:
        console.error(consoleMessage, meta || '');
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, meta || '');
        break;
      case LogLevel.INFO:
        console.info(consoleMessage, meta || '');
        break;
      case LogLevel.DEBUG:
        console.log(consoleMessage, meta || '');
        break;
    }

    // Write to file (server-side only)
    this.writeToFile(logEntry);
  }

  error(message: string, meta?: any, context?: { requestId?: string; userId?: string; endpoint?: string }) {
    this.log(LogLevel.ERROR, 'ERROR', message, meta, context);
  }

  warn(message: string, meta?: any, context?: { requestId?: string; userId?: string; endpoint?: string }) {
    this.log(LogLevel.WARN, 'WARN', message, meta, context);
  }

  info(message: string, meta?: any, context?: { requestId?: string; userId?: string; endpoint?: string }) {
    this.log(LogLevel.INFO, 'INFO', message, meta, context);
  }

  debug(message: string, meta?: any, context?: { requestId?: string; userId?: string; endpoint?: string }) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta, context);
  }

  // API-specific logging methods
  apiRequest(method: string, url: string, requestId: string, meta?: any) {
    this.info(`${method} ${url}`, meta, { requestId, endpoint: url });
  }

  apiResponse(method: string, url: string, statusCode: number, responseTime: number, requestId: string, meta?: any) {
    this.info(`${method} ${url} - ${statusCode} (${responseTime}ms)`, meta, { requestId, endpoint: url });
  }

  apiError(method: string, url: string, error: Error, requestId: string, meta?: any) {
    this.error(`${method} ${url} - ${error.message}`, { error: error.stack, ...meta }, { requestId, endpoint: url });
  }

  // Parsing-specific logging methods
  parseStart(spreadsheetId: string, requestId: string) {
    this.info(`Starting parse for spreadsheet: ${spreadsheetId}`, { spreadsheetId }, { requestId, endpoint: '/api/parse' });
  }

  parseSuccess(spreadsheetId: string, stats: any, duration: number, requestId: string) {
    this.info(`Parse completed successfully for ${spreadsheetId} (${duration}ms)`, { spreadsheetId, stats }, { requestId, endpoint: '/api/parse' });
  }

  parseError(spreadsheetId: string, error: Error, duration: number, requestId: string) {
    this.error(`Parse failed for ${spreadsheetId} (${duration}ms)`, { spreadsheetId, error: error.stack }, { requestId, endpoint: '/api/parse' });
  }
}

// Export a singleton instance
export const logger = new Logger();

// Helper function to generate request IDs
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
