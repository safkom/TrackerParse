import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface LogQuery {
  date?: string;
  level?: string;
  limit?: number;
  search?: string;
  endpoint?: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query: LogQuery = {
      date: url.searchParams.get('date') || undefined,
      level: url.searchParams.get('level') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '100'),
      search: url.searchParams.get('search') || undefined,
      endpoint: url.searchParams.get('endpoint') || undefined,
    };

    const logsDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({ logs: [], message: 'No logs directory found' });
    }

    // Get log files
    let logFiles = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .sort((a, b) => b.localeCompare(a)); // Most recent first

    // Filter by date if specified
    if (query.date) {
      logFiles = logFiles.filter(file => file.includes(query.date!));
    }

    // Read and parse logs
    let allLogs: any[] = [];
    
    for (const file of logFiles.slice(0, 10)) { // Limit to 10 most recent files
      const filePath = path.join(logsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line);
          allLogs.push(logEntry);
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }
    }

    // Sort by timestamp (most recent first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters
    let filteredLogs = allLogs;

    if (query.level) {
      filteredLogs = filteredLogs.filter(log => 
        log.level.toLowerCase() === query.level!.toLowerCase()
      );
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        (log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchTerm))
      );
    }

    if (query.endpoint) {
      filteredLogs = filteredLogs.filter(log => 
        log.endpoint && log.endpoint.includes(query.endpoint!)
      );
    }

    // Apply limit
    const limitedLogs = filteredLogs.slice(0, query.limit);

    // Get summary stats
    const stats = {
      total: allLogs.length,
      filtered: filteredLogs.length,
      returned: limitedLogs.length,
      levels: allLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      endpoints: allLogs.reduce((acc, log) => {
        if (log.endpoint) {
          acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      logs: limitedLogs,
      stats,
      query,
    });

  } catch (error) {
    console.error('Error reading logs:', error);
    return NextResponse.json(
      { error: 'Failed to read logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get available log files
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'list-files') {
      const logsDir = path.join(process.cwd(), 'logs');
      
      if (!fs.existsSync(logsDir)) {
        return NextResponse.json({ files: [] });
      }

      const files = fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(logsDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            date: file.replace('app-', '').replace('.log', ''),
          };
        })
        .sort((a, b) => b.modified.localeCompare(a.modified));

      return NextResponse.json({ files });
    }

    if (action === 'clear-logs') {
      const logsDir = path.join(process.cwd(), 'logs');
      
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
        let deletedCount = 0;
        
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(logsDir, file));
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete ${file}:`, error);
          }
        }
        
        return NextResponse.json({ 
          message: `Deleted ${deletedCount} log files`,
          deletedCount 
        });
      }
      
      return NextResponse.json({ message: 'No logs directory found', deletedCount: 0 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in logs POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
