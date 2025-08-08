// Edge-compatible logger for middleware and edge runtime
export interface EdgeLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
}

class EdgeLogger {
  log(level: EdgeLogEntry['level'], message: string, data?: any, metadata?: Partial<EdgeLogEntry>) {
    const entry: EdgeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      ...metadata
    };

    // Only log to console in edge runtime
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
  }

  info(message: string, data?: any, metadata?: Partial<EdgeLogEntry>) {
    this.log('info', message, data, metadata);
  }

  warn(message: string, data?: any, metadata?: Partial<EdgeLogEntry>) {
    this.log('warn', message, data, metadata);
  }

  error(message: string, data?: any, metadata?: Partial<EdgeLogEntry>) {
    this.log('error', message, data, metadata);
  }

  debug(message: string, data?: any, metadata?: Partial<EdgeLogEntry>) {
    this.log('debug', message, data, metadata);
  }

  // Simplified request logging for edge runtime
  logRequest(req: any, metadata?: any) {
    const entry: Partial<EdgeLogEntry> = {
      requestId: req.headers.get('x-request-id') || this.generateRequestId(),
      ip: req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
      url: req.url,
      method: req.method
    };

    this.info(`${req.method} ${req.url}`, metadata, entry);
  }

  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const edgeLogger = new EdgeLogger();
export const generateRequestId = () => edgeLogger.generateRequestId();
